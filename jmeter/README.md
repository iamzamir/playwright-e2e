# JMeter Performance Testing

This directory contains all files and scripts needed for running PSR Performance Tests locally and understanding the CI/CD workflow.

## 📚 Documentation

- **[🚀 Quick Start Guide](../QUICK_START.md)** - Get up and running in 5 minutes
- **[📖 Complete Setup Guide](../LOCAL_JMETER_SETUP_GUIDE.md)** - Comprehensive documentation
- **[🛠️ Troubleshooting Guide](../TROUBLESHOOTING.md)** - Fix common issues

## 🏃‍♂️ Quick Start

```powershell
# 1. Setup environment
Copy-Item .env.template .env
# Edit .env file with your CLIENT_SECRET

# 2. Run test
.\run-local-performance-test.ps1

# 3. View results in auto-opened HTML report
```

## 📁 Directory Structure

```
jmeter/
├── Tests/
│   ├── PSRWorkflowTest.jmx          # Main JMeter test plan
│   ├── PSRTest.jmx                  # Core PSR test plan (Azure APIM gateway)
│   └── PSRGraviteeTest.jmx          # Core PSR test plan (Gravitee gateway)
├── Testdata/
│   └── LinksData.csv                # Test data for links testing
├── run-local-performance-test.ps1   # PowerShell script for local execution
├── run-local-test.bat              # Batch script alternative
├── .env.template                   # Environment variables template
├── README.md                       # This file
└── results/                        # Generated test results (git-ignored)
    ├── *.jtl                       # Test result files
    └── *-report/                   # HTML reports
```

## 🚀 Quick Start

### 1. Setup Environment

Copy the environment template and configure your secret:

```powershell
# Copy template
Copy-Item .env.template .env

# Edit .env file and replace 'your-client-secret-here' with actual value
notepad .env
```

### 2. Run Tests

**Option A: PowerShell Script (Recommended)**
```powershell
# Navigate to jmeter directory
cd jmeter

# Basic execution
.\run-local-performance-test.ps1

# With custom parameters
.\run-local-performance-test.ps1 -Environment QA -Threads 10 -Duration 120
```

**Option B: Batch Script**
```cmd
cd jmeter
run-local-test.bat
```

**Option C: Direct JMeter**
```powershell
cd jmeter
jmeter -n -t Tests/PSRWorkflowTest.jmx -JCLIENT_SECRET="$env:CLIENT_SECRET" -l results/test.jtl
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CLIENT_SECRET` | Azure B2C Client Secret | Yes (Azure) | - |
| `PSR_GRAVITEE_CLIENT_ID` | Gravitee OAuth client id | Yes (Gravitee) | - |
| `PSR_GRAVITEE_CLIENT_SECRET` | Gravitee OAuth client secret | Yes (Gravitee) | - |
| `REALM_KEY` | Gravitee realm key | No | `popspsr-psr` |
| `GRAVITEE_DOMAIN_SUFFIX` | Gravitee domain suffix | No | `psr.na.blueyonder.dev` |
| `TEST_THREADS` | Number of concurrent users | No | 5 |
| `TEST_DURATION` | Test duration in seconds | No | 60 |
| `TEST_ENVIRONMENT` | Target environment | No | QA |

### Gateway selection

`PSRTest.jmx` targets the **Azure APIM** gateway (`api-psrtest.jdadelivers.com`, Azure B2C token endpoint).
`PSRGraviteeTest.jmx` is the same test plan against the **Gravitee** gateway. It is identical in samplers,
payloads, thread groups and pacing, so results are directly comparable. Only the routing and auth differ:

| | `PSRTest.jmx` (Azure) | `PSRGraviteeTest.jmx` (Gravitee) |
|---|---|---|
| API host | `api-psrtest.jdadelivers.com` | `${API_HOST}` (default `popspsr-psr.api.psr.na.blueyonder.dev`) |
| Auth host | `blueyonderpsrtestus.b2clogin.com` | `${AUTH_HOST}` (default `popspsr-psr.auth.psr.na.blueyonder.dev`) |
| Token path | `/…/B2C_1A_ClientCredential/oauth2/v2.0/token` | `/oauth/token` |
| Token body | `grant_type`, `client_id`, `client_secret`, `realmId`, `scope` | `grant_type`, `client_id`, `client_secret` |
| API paths | `cbp/psr/ibp/...` | `cbp/psr/ibp/...` (unchanged) |

`API_HOST` and `AUTH_HOST` are overridable with `-JAPI_HOST=` / `-JAUTH_HOST=`. The workflow and the local
runner build them from the realm key and domain suffix and pass them in — JMeter does not expand a variable
that is nested inside another variable's value, so the composition has to happen outside the test plan.

Run the Gravitee variant locally:

```powershell
cd jmeter
.\run-local-performance-test.ps1 -TestName "PSRGraviteeTest"
```

The gateway follows the selected plan — plans whose name contains `Gravitee` use the Gravitee gateway
and its credentials, everything else uses Azure. There is no separate gateway switch to keep in sync.

### Test Parameters

| Parameter | Description | Valid Values | Default |
|-----------|-------------|--------------|---------|
| Environment | Target environment | QA, INTEROP | QA |
| Threads | Concurrent users | 1-100 | 5 |
| Duration | Test duration | 10-3600 seconds | 60 |

## 📊 Test Scenarios

The `PSRWorkflowTest.jmx` includes these test scenarios:

1. **Authentication**
   - OAuth2 Bearer Token generation
   - Token validation and extraction

2. **Entity View Mapping**
   - Map views to entities
   - Search existing mappings
   - Clear mappings
   - Bulk mapping operations

3. **Procedure Mapping**
   - Map procedures to views
   - Search primary/secondary mappings
   - Remove procedure mappings

4. **Action Items CRUD**
   - Create action items (Process, SubProcess, Assumption)
   - Search action items
   - Edit action items
   - Delete action items

## 📈 Results and Reporting

### Output Files

After running tests, you'll find:

```
results/
├── PSRWorkflowTest-local-[timestamp].jtl           # Raw results
└── PSRWorkflowTest-local-report-[timestamp]/       # HTML report
    ├── index.html                                  # Main report
    ├── content/                                    # Report assets
    └── sbadmin2-1.0.7/                            # Report styling
```

### Key Metrics

- **Total Samples**: Number of requests executed
- **Failed Samples**: Number of failed requests
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Mean response time in milliseconds
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests

### Success Criteria

| Metric | Threshold | Status |
|--------|-----------|---------|
| Success Rate ≥ 95% | ✅ PASSED | Green |
| Success Rate ≥ 90% | ⚠️ WARNING | Yellow |
| Success Rate < 90% | ❌ FAILED | Red |

## 🔐 Security

### Best Practices

- ✅ Use `.env` file for local development
- ✅ Never commit `.env` to version control
- ✅ Use environment variables in CI/CD
- ✅ Rotate secrets regularly
- ❌ Never hardcode secrets in test files

### Environment Files

```bash
# .env file format
CLIENT_SECRET=your-actual-secret-here
TEST_THREADS=5
TEST_DURATION=60
TEST_ENVIRONMENT=QA
```

## 🛠️ Prerequisites

### Local Development

1. **JMeter 5.6.3+**
   - Download: https://jmeter.apache.org/download_jmeter.cgi
   - Add to PATH environment variable

2. **Java 8+**
   - Required for JMeter execution
   - Verify: `java -version`

3. **PowerShell 5.1+** (for PowerShell scripts)
   - Available by default on Windows
   - PowerShell Core 6+ also supported

### Network Access

- Access to target environments (QA/INTEROP)
- Azure B2C authentication endpoints
- PSR application APIs

## 🔧 Troubleshooting

### Common Issues

**"CLIENT_SECRET not set"**
```powershell
# Check if variable is set
echo $env:CLIENT_SECRET

# Set temporarily
$env:CLIENT_SECRET = "your-secret"

# Check .env file exists and format is correct
Get-Content .env
```

**"JMeter not found"**
```powershell
# Verify installation
jmeter -version

# Check PATH variable
$env:PATH -split ';' | Where-Object { $_ -like '*jmeter*' }
```

**"Test failed"**
- Check JMeter logs in `jmeter.log`
- Verify network connectivity
- Confirm client secret is valid
- Check target environment availability

**"Permission denied"**
```powershell
# Run as Administrator
Start-Process PowerShell -Verb RunAs

# Or adjust execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Debug Mode

For detailed debugging:

```powershell
# Enable JMeter debug logging
jmeter -n -t Tests/PSRWorkflowTest.jmx -l results/debug.jtl -Lorg.apache.jmeter=DEBUG
```

## 🔄 CI/CD Integration

### GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/psr-links-performance-test.yaml`) that:

1. Runs on schedule or manual trigger
2. Sets up JMeter environment
3. Executes the same test plan
4. Publishes results to GitHub Pages
5. Sends notifications to Microsoft Teams

### Local CI/CD

For local pipeline integration:

```yaml
# Azure DevOps example
steps:
- powershell: |
    cd jmeter
    $env:CLIENT_SECRET = "$(ClientSecretVariable)"
    .\run-local-performance-test.ps1 -Environment QA -Threads 10 -Duration 300
  displayName: 'Run Performance Tests'
```

## 📚 Additional Resources

- [JMeter Documentation](https://jmeter.apache.org/usermanual/index.html)
- [JMeter Best Practices](https://jmeter.apache.org/usermanual/best-practices.html)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🤝 Contributing

When adding new tests or modifying existing ones:

1. Update test documentation in this README
2. Ensure all secrets remain parameterized
3. Test both local and CI/CD execution
4. Update version numbers if needed
5. Follow JMeter best practices for performance testing