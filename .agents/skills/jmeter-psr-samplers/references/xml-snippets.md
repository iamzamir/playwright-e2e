# JMX XML snippets

These snippets are copied from `jmeter/Tests/PSRGatewayTest.jmx`. Each one shows an element followed by the `hashTree` it needs. When you nest a snippet inside a controller, re-indent it by 2 spaces per level.

## GET sampler, no body

```xml
<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Area1: Short Description" enabled="true">
  <stringProp name="HTTPSampler.domain">${API_HOST}</stringProp>
  <stringProp name="HTTPSampler.protocol">https</stringProp>
  <stringProp name="HTTPSampler.path">/cbp/psr/ibp/process-orchestration/v1/some/path?pageNumber=0&amp;pageSize=10</stringProp>
  <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
  <stringProp name="HTTPSampler.method">GET</stringProp>
  <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
  <boolProp name="HTTPSampler.postBodyRaw">false</boolProp>
  <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables">
    <collectionProp name="Arguments.arguments"/>
  </elementProp>
</HTTPSamplerProxy>
<hashTree>
  <!-- header manager, assertions, extractors -->
</hashTree>
```

Use `&amp;` in query strings. For DELETE, change the method and keep the same shape.

## POST or PUT sampler with a raw JSON body

```xml
<boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
<elementProp name="HTTPsampler.Arguments" elementType="Arguments">
  <collectionProp name="Arguments.arguments">
    <elementProp name="" elementType="HTTPArgument">
      <boolProp name="HTTPArgument.always_encode">false</boolProp>
      <stringProp name="Argument.value">{
  &quot;name&quot;: &quot;${perfName}&quot;
}</stringProp>
      <stringProp name="Argument.metadata">=</stringProp>
    </elementProp>
  </collectionProp>
</elementProp>
```

## Header manager (required on every sampler)

```xml
<HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
  <collectionProp name="HeaderManager.headers">
    <elementProp name="" elementType="Header">
      <stringProp name="Header.name">Content-Type</stringProp>
      <stringProp name="Header.value">application/json</stringProp>
    </elementProp>
    <elementProp name="" elementType="Header">
      <stringProp name="Header.name">Authorization</stringProp>
      <stringProp name="Header.value">Bearer ${__property(access_token)}</stringProp>
    </elementProp>
    <elementProp name="" elementType="Header">
      <stringProp name="Header.name">accept</stringProp>
      <stringProp name="Header.value">application/json</stringProp>
    </elementProp>
  </collectionProp>
</HeaderManager>
<hashTree/>
```

## Assertions

`Assertion.test_type` takes these values: 8 = Equals, 16 = Substring, 1 = Matches (regex).

```xml
<ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Assert Response Code 200" enabled="true">
  <collectionProp name="Asserion.test_strings">
    <stringProp name="49586">200</stringProp>
  </collectionProp>
  <stringProp name="Assertion.custom_message"></stringProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <boolProp name="Assertion.assume_success">false</boolProp>
  <intProp name="Assertion.test_type">8</intProp>
</ResponseAssertion>
<hashTree/>
```

- The collection name `Asserion.test_strings` really is misspelled. That's JMeter's own property name, so keep it.
- For an expected 4xx (a 404 after delete, or a `200|404` pre-clean), set `assume_success` to `true`. Otherwise JMeter still marks the sample failed.
- To check body text, set `Assertion.test_field` to `Assertion.response_data` and `test_type` to 16.

```xml
<JSONPathAssertion guiclass="JSONPathAssertionGui" testclass="JSONPathAssertion" testname="Assert name" enabled="true">
  <stringProp name="JSON_PATH">$.name</stringProp>
  <stringProp name="EXPECTED_VALUE">${expected}</stringProp>
  <boolProp name="JSONVALIDATION">true</boolProp>
  <boolProp name="EXPECT_NULL">false</boolProp>
  <boolProp name="INVERT">false</boolProp>
  <boolProp name="ISREGEX">false</boolProp>
</JSONPathAssertion>
<hashTree/>
```

To check only that a path exists, set `JSONVALIDATION` to `false` and leave `EXPECTED_VALUE` empty.

## Extractor, JSR223 and If Controller

```xml
<JSONPostProcessor guiclass="JSONPostProcessorGui" testclass="JSONPostProcessor" testname="JSON Extractor myId" enabled="true">
  <stringProp name="JSONPostProcessor.referenceNames">myId</stringProp>
  <stringProp name="JSONPostProcessor.jsonPathExprs">$.id</stringProp>
  <stringProp name="JSONPostProcessor.match_numbers"></stringProp>
  <stringProp name="JSONPostProcessor.defaultValues">NOT_FOUND</stringProp>
</JSONPostProcessor>
<hashTree/>

<JSR223PostProcessor guiclass="TestBeanGUI" testclass="JSR223PostProcessor" testname="Do Something" enabled="true">
  <stringProp name="cacheKey">true</stringProp>
  <stringProp name="filename"></stringProp>
  <stringProp name="parameters"></stringProp>
  <stringProp name="script">vars.put(&apos;k&apos;, &apos;v&apos;)
</stringProp>
  <stringProp name="scriptLanguage">groovy</stringProp>
</JSR223PostProcessor>
<hashTree/>

<IfController guiclass="IfControllerPanel" testclass="IfController" testname="If Id Found" enabled="true">
  <stringProp name="IfController.condition">${__groovy((vars.get(&apos;myId&apos;) ?: &apos;NOT_FOUND&apos;) != &apos;NOT_FOUND&apos;,)}</stringProp>
  <boolProp name="IfController.evaluateAll">false</boolProp>
  <boolProp name="IfController.useExpression">true</boolProp>
</IfController>
<hashTree>
  <!-- guarded samplers -->
</hashTree>
```

- `JSR223PreProcessor` and `JSR223Assertion` take the same properties as `JSR223PostProcessor`. In an assertion, report a failure with `AssertionResult.setFailure(true)` and `AssertionResult.setFailureMessage(...)`.
- Inside `__groovy(...)`, a comma separates function arguments, so escape any comma in the expression as `\,`.

## tearDown thread group

```xml
<PostThreadGroup guiclass="PostThreadGroupGui" testclass="PostThreadGroup" testname="tearDown Thread Group - Cleanup" enabled="true">
  <stringProp name="ThreadGroup.num_threads">1</stringProp>
  <intProp name="ThreadGroup.ramp_time">1</intProp>
  <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
  <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
  <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller">
    <stringProp name="LoopController.loops">1</stringProp>
    <boolProp name="LoopController.continue_forever">false</boolProp>
  </elementProp>
</PostThreadGroup>
<hashTree>
  <!-- list sampler + JSON Extractor (match_numbers -1, regex filter) + ForeachController + DELETE -->
</hashTree>
```

Put this as a sibling of the main Thread Group, inside the Test Plan's `hashTree`.
