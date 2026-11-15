// People confirm or reclassify a failure group on its GitHub triage issue (plan §9.3); these helpers turn labels into decisions.
const { CATEGORY_ORDER } = require('./cluster');

const CATEGORY_LABELS = {
  PRODUCT_DEFECT: 'category:product-defect',
  AUTOMATION_ISSUE: 'category:automation',
  TEST_DATA_ISSUE: 'category:test-data',
  ENVIRONMENT_ISSUE: 'category:environment',
  TO_INVESTIGATE: 'category:to-investigate',
  FLAKY: 'category:flaky'
};
const LABEL_CATEGORIES = Object.fromEntries(Object.entries(CATEGORY_LABELS).map(([category, label]) => [label, category]));
const RECLASSIFIED = 'Reclassified by a person';
const LABEL_CATEGORY_KEYS = new Set(Object.keys(CATEGORY_LABELS));
// Tick boxes in the issue body: one click, no label permissions or label lookup. Each line carries its key in a hidden
// HTML comment, so rewording the text never breaks parsing. Checked boxes are only read inside this section. The start
// marker records the rules' category the section was written for, since a recurring group's category can change, and
// the category of the issue's category:* label at that time. The sync never updates that label, so only a label that
// differs from the recorded one was swapped by a person; a label that is merely stale is not a reclassification.
const DECISION_SECTION = /<!-- triage-decision:start(?: rules=([A-Z_]+))?(?: label=([A-Z_]+))? -->([\s\S]*?)<!-- triage-decision:end -->/;
const CHOICES = {
  PRODUCT_DEFECT: 'a product defect',
  AUTOMATION_ISSUE: 'an automation issue',
  TEST_DATA_ISSUE: 'a test data issue',
  ENVIRONMENT_ISSUE: 'an environment issue',
  FLAKY: 'flaky (passes on retry or another night)'
};
const NAMES = { ...CHOICES, TO_INVESTIGATE: 'to investigate', FLAKY: 'flaky' };
// GitHub's state_reason of a closed issue: what happened to the group, which is not a category decision.
const RESOLUTIONS = { completed: 'resolved', not_planned: 'not planned', duplicate: 'duplicate' };

// The decision block of a triage issue. No "category is right" box when the rules made no call (To investigate).
// labelCategory: the category of the issue's category:* label now (a new issue's label is the rules' category).
function decisionSection(autoCategory, labelCategory = autoCategory) {
  const label = LABEL_CATEGORY_KEYS.has(labelCategory) ? ` label=${labelCategory}` : '';
  const lines = [`<!-- triage-decision:start rules=${autoCategory}${label} -->`, '**Decision** (tick one box; the nightly sync reads it):'];
  if (CHOICES[autoCategory]) lines.push(`- [ ] The category is right: it is ${NAMES[autoCategory]} <!-- confirm -->`);
  for (const [category, name] of Object.entries(CHOICES)) {
    if (category !== autoCategory) lines.push(`- [ ] It is ${name} <!-- ${category} -->`);
  }
  lines.push('<!-- triage-decision:end -->');
  return lines.join('\n');
}

// The section in a body: the rules' and label's categories it was written for (null if unknown) and the categories of
// its ticked boxes in order ("category is right" stands for the section's own rules category).
function sectionOf(body) {
  const section = String(body || '').match(DECISION_SECTION);
  if (!section) return null;
  const rules = section[1] || null;
  const label = section[2] || null;
  const ticked = [...section[3].matchAll(/^[ \t]*[-*][ \t]+\[[xX]\][^\n]*<!--[ \t]*(confirm|[A-Z_]+)[ \t]*-->/gm)]
    .map((match) => (match[1] === 'confirm' ? rules : match[1]))
    .filter((category) => CHOICES[category]);
  return { rules, label, ticked };
}

// Categories of the ticked boxes, in order.
function tickedBoxes(body) {
  const section = sectionOf(body);
  return section ? section.ticked : [];
}

function labelNames(issue) {
  return (issue.labels || []).map((label) => (typeof label === 'string' ? label : label.name));
}

// The category of the issue's category:* label (the first, if a person left two).
function labelCategory(issue) {
  return labelNames(issue).map((name) => LABEL_CATEGORIES[name]).find(Boolean) || null;
}

// A ticked box wins: it names the category outright, so it holds even after tonight's rules changed their mind (it
// confirms when it matches tonight's rules, else it reclassifies). Without one, a swapped category:* label
// reclassifies: one that differs from the label recorded in the section, or, for an issue with no recorded label,
// one that differs from tonight's rules. decision:confirmed confirms. A closed issue's state_reason is kept as its
// resolution, apart from the decision.
function decisionFrom(issue, autoCategory) {
  const names = labelNames(issue);
  const categories = names.map((name) => LABEL_CATEGORIES[name]).filter(Boolean);
  const section = sectionOf(issue.body);
  const [boxCategory] = section ? section.ticked : [];
  const swapped = section && section.label
    ? categories.find((item) => item !== section.label)
    : categories.find((item) => item !== autoCategory);
  const category = boxCategory || swapped || autoCategory;
  const confirmed = boxCategory ? boxCategory === autoCategory : names.includes('decision:confirmed');
  const outside = String(issue.body || '').replace(/<!-- triage-draft:start -->[\s\S]*<!-- triage-draft:end -->/, '').replace(DECISION_SECTION, '');
  // Only a line that starts with "Jira:" counts: the generated header quotes an example key mid-sentence.
  const jira = outside.match(/^[ \t]*Jira:[ \t]*([A-Z][A-Z0-9]+-\d+)\b/m);
  return {
    issue: issue.number,
    url: issue.html_url,
    state: issue.state,
    decision: confirmed ? 'confirmed' : 'pending',
    category,
    jira: jira ? jira[1] : null,
    resolution: issue.state === 'closed' ? RESOLUTIONS[issue.state_reason] || 'closed' : null,
    closedAt: issue.state === 'closed' ? issue.closed_at || null : null
  };
}

// Applies decisions ({ clusterId: decision }) to the night's groups; reapplying is safe (autoCategory keeps the rule result).
function applyDecisions(clusters, decisions) {
  const list = clusters.map((cluster) => {
    const auto = cluster.autoCategory || cluster.category;
    const { autoCategory, triage, ...base } = cluster;
    const reasons = (base.reasons || []).filter((reason) => !reason.startsWith(RECLASSIFIED));
    const decision = decisions && decisions[cluster.id];
    if (!decision) return { ...base, category: auto, reasons };
    const info = { issue: decision.issue, url: decision.url, state: decision.state, decision: decision.decision, jira: decision.jira || null, resolution: decision.resolution || null, closedAt: decision.closedAt || null };
    if (decision.category && decision.category !== auto && CATEGORY_LABELS[decision.category]) {
      return { ...base, category: decision.category, autoCategory: auto, reasons: [`${RECLASSIFIED} in issue #${decision.issue} (rules said ${auto.toLowerCase().replace(/_/g, ' ')})`, ...reasons], triage: { ...info, reclassified: true } };
    }
    return { ...base, category: auto, reasons, triage: info };
  });
  return list.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || b.counts.failed - a.counts.failed);
}

// Precision of automatic categories against human decisions on a night's clusters (plan §2 G3, §10 Phase 5).
// Groups the rules left as TO_INVESTIGATE made no call, so a person resolving them is counted apart, not as a miss.
function decisionPrecision(clusters) {
  let decided = 0;
  let confirmed = 0;
  let reclassified = 0;
  let resolved = 0;
  for (const cluster of clusters || []) {
    const triage = cluster.triage;
    if (!triage) continue;
    const auto = cluster.autoCategory || cluster.category;
    const human = triage.reclassified || triage.decision === 'confirmed';
    if (auto === 'TO_INVESTIGATE') {
      if (triage.reclassified) resolved++;
      continue;
    }
    if (!human) continue;
    decided++;
    if (triage.reclassified) reclassified++;
    else confirmed++;
  }
  return {
    decided,
    confirmed,
    reclassified,
    precisionPct: decided ? Math.round((confirmed / decided) * 100) : null,
    resolved
  };
}

module.exports = { CATEGORY_LABELS, LABEL_CATEGORIES, DECISION_SECTION, decisionSection, sectionOf, tickedBoxes, labelCategory, decisionFrom, applyDecisions, decisionPrecision, labelNames };
