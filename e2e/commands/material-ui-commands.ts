export const getReactTestIdComponent$ = (dataTestId: string) => {
  return browser.react$('*', { props: { 'data-testid': `${dataTestId}` } });
};

export const getReactTestIdComponent$$ = (dataTestId: string) => {
  return browser.react$$('*', { props: { 'data-testid': `${dataTestId}` } });
};

export async function clearText(selector: WebdriverIO.Element) {
  let valueLength = (await selector.getValue()).length
  let backSpaces = new Array(valueLength).fill('Backspace')
  await selector.setValue(backSpaces);
};