# Built-in processors that will be usable for all data-channels channel configs

These processors will be tailored for accomplishing common tasks that are used by many projects.  This repo is "inner-source", please share any ideas you have for future built-ins and request access to create PRs.

Built-ins are published on the `data-channels-BuiltInProcessor` processor lambda.

Example step config that uses a built-in:

```json
{
    "translate": {
      "inputs": [
        "CourseCatalog->courses"
      ],
      "method": "translate",
      "outputs": [
        "coursesTranslated->input"
      ],
      "processor": "data-channels-BuiltInProcessor",
      "parameters": {
        "translateConfig": {
          "valueMappings": {
            "CTE": [
              {
                "toValue": "",
                "fromValue": "N"
              }
            ]
          }
        }
      },
      "granularity": "row"
    }
}

```

## Function Usage Reference

### Echo

Echo's back any inputs it is given.  Meant for testing things out.

| | |
| ---- | --- |
| **method name** | echo |
| **granularity** | row |
| **code** | [Echo.ts](src/processors/Echo.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Input name plus "Echo", e.g. "dataEcho" |
| **config property name** | echoConfig *(not required)* |

You can provide multiple inputs if desired.  Note that by default `echo` will put the first and last row of each input in the `outputs` section of the job result itself, in addition to creating the named output files.  If you want `echo` to put all rows into the `outputs` section of the job then you must provide `echoConfig` with a property of `outputAllRows` set to true.

### Translate

Translate column names and row values from one string to another.

| | |
| ---- | --- |
| **method name** | translate |
| **granularity** | row |
| **code** | [Translate.ts](src/processors/Translate.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Input name plus "Translated", e.g. "dataTranslated" |
| **config property name** | translateConfig |

`translateConfig` is required.  There are three possible properties under translateConfig
* headerMappings - map one header name to another
* valueMappings - map values in one column from one thing to another
* indexMappings - map header names based on index of the header in the file, starts at index 1.

Example Config

```json
"parameters": {
  "translateConfig": {
    "headerMappings": {
      "studentID": "Student_ID"
    },
    "valueMappings": {
      "CTE": [
        {
          "toValue": "",
          "fromValue": "N"
        }
      ]
    },
    "indexMappings": {
      "3": "Student_Name"
    }
  }
}
```

### Validate

Validate that column names are correct and rows contain valid values.

| | |
| ---- | --- |
| **method name** | validate |
| **granularity** | row |
| **code** | [Validate.ts](src/processors/Validate.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Input name plus "Validated", e.g. "dataValidated" |
| **config property name** | validateConfig |

`validateConfig` is required.  Properties under validateConfig:
* columns - main config properties under `columns` are column names for keys, with objects as values.  Each object supports the following:
  * required - boolean, invalid if column doesn't exist
  * validTypes - Array of valid data types, see code for all types
  * validValues - Array of strings that represent valid values
  * invalidIfBlank - boolean, row is invalid if the column has a blank value
* discardInvalidRows - boolean defaults to false, throw away rows from data file if they are invalid

See [Validate.ts](src/processors/Validate.ts) code for more many more advanced config options

Example Config

```json
"parameters": {
  "validateConfig": {
    "columns": {
      "Status": {
        "required": false,
        "validValues": [
          "Y",
          ""
        ]
      },
      "Credits": {
        "required": true,
        "validTypes": [
          "decimal"
        ],
        "invalidIfBlank": true
      },
      "Coreq_ID": {
        "required": false
      }
    },
    "discardInvalidRows": true
  }
}
```

### Sort

Sorts an input based on one or more columns

| | |
| ---- | --- |
| **method name** | sort |
| **granularity** | row |
| **code** | [Sort.ts](src/processors/Sort.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Input name plus "Sorted", e.g. "dataSorted" |
| **config property name** | sortConfig |

`sortConfig` contains a property for each input by input name.  This property is a list of `[columnName]: string` objects.  Each object has to have a `columnName` string property, and can also define a boolean for treating the column as a number, and for sorting in descending order.

Example Config

```json
"parameters": {
  "sortConfig": {
    "data": [
      {
        "columnName": "myStringColumn"
      },
      {
        "columnName": "myNumberColumn",
        "asNumber": true,
        "descending": true
      }
    ]
  }
}
```

### GroupBy

Groups multiple rows in an input into a single row

| | |
| ---- | --- |
| **method name** | groupby |
| **granularity** | row |
| **code** | [GroupBy.ts](src/processors/GroupBy.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Input name plus "Sorted", e.g. "dataGrouped" |
| **config property name** | groupByConfig |

`groupByConfig` contains two properties:
* header - Which column to group rows by
* mode - Either `rows` or `objects`
  * rows - grouped row will be a json object with `rows` and `headers` property.  The rows property will be an array of string arrays.  The headers property will be a string array of the headers from the file.
  * objects - grouped will be a json object with `rows` property that is an array of objects.  Each object will have keys for the headers, and values for the row.

**IMPORTANT** GroupBy assumes that the data has already been sorted.  If your data is not sorted, use the `sort` builtin as a prior step to `groupby`.

Example Config

```json
"parameters": {
  "groupByConfig": {
    "mode": "rows",
    "header": "Student_ID"
  }
}
```

### Diff

Compare one or more inputs to the prior versions from the last job for this tenant and channel.

| | |
| ---- | --- |
| **method name** | diff |
| **granularity** | row |
| **code** | [Diff.ts](src/processors/Diff.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Four outputs for every input.  e.g. "dataAdded", "dataModified", "dataUnmodified", "dataDeleted" |
| **config property name** | Use input names as parameter keys, see example |

Diff will create four outputs for each input.  These outputs can be used by subsequent steps as desired.  Each input can specify it's own primary key columns that combined identify a unique row.  This unique identifier is used to determine if a row was modified, deleted, added, or unmodified since the last time this job was run for the same tenant and channel.

Example config with input named "data".
```
"parameters": {
  "data": {
    "primaryKeyColumns": ["Student_ID", "Student_Email"]
  }
}
```

**Modified output**

For each `IFileDiffConfig`, a `modifiedOutput` field can be specified, which controls the format of the modified output.

The `modifiedOutput` format:

| | |
| ---- | --- |
| **outputFormat** | The format of the output |
| **unmodifiedValue** | What unmodified values should be replaced with |

`outputFormat` values:

| | |
| --- | --- |
| **newAll** | Output all values from the new file |
| **newChangedOnly** | Output only values that have changed in the new file, replace others with `unmodifiedValue` |
| **oldAll** | Output all values from the old file |
| **oldChangedOnly** | Output only values that have changed in the old file, replace others with `unmodifiedValue` |


Example modified config:
```json
{
  "parameters": {
    "testInput": {
      "primaryKeyColumns": [
        "id"
      ],
      "modifiedOutput":  {
        "outputFormat": "newChangedOnly",
        "unmodifiedValue": ""
      }
    }
  }
}
```

### SNS

Send an SNS notification out out with the basic info of the job.  Note that this method could be duplicated and modified for lots of other SNS situations.

| | |
| ---- | --- |
| **method name** | sns |
| **granularity** | once |
| **code** | [SNS.ts](src/processors/SNS.ts) |
| **input name** | N/A |
| **output name** | N/A |
| **config property name** | arn |

`arn` config property is just the ARN of the topic to be published to

```json
"arn": "arn:aws:sns:us-east-1:315912493465:um-data-channels-sns-stepOutput"
```

### Email (SES)

Send an email out with the basic info of the job.  Note that this method could be duplicated and modified for lots of other email situations.

| | |
| ---- | --- |
| **method name** | emailJobInfo |
| **granularity** | once |
| **code** | [SES.ts](src/processors/SES.ts) |
| **input name** | N/A |
| **output name** | N/A |
| **config property name** | emailConfig |

`emailConfig` takes `to` property which is a list of email addresses.

```json
"emailConfig": {
  "to": ["someone@somewhere.com"]
}
```

### ThrowError

Immediately throws an error.  Useful for testing `alwaysRun` property on subsequent steps in channel config.

| | |
| ---- | --- |
| **method name** | throwError |
| **granularity** | row, once |
| **code** | [ThrowError.ts](src/processors/ThrowError.ts) |
| **input name** | N/A |
| **output name** | N/A |
| **config property name** | N/A |


### SQL / Athena

Allows you to run SQL queries against inputs and create outputs from the resulting queries.

| | |
| ---- | --- |
| **method name** | sql |
| **granularity** | once |
| **code** | [Athena.ts](src/processors/Athena.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Any output name you want, must match the query name in your config |
| **config property name** | sqlConfig |

`sqlConfig` has one required and one optional properties:
* outputs - Required property should contain one entry per output name
  * query - The query to run to produce the output
* inputs - Optional property, should one entry per intput name that needs additonal config
  * columnTypes - Optional property to define non-string column types for certain columns in the input.  See [Athena Data Types](https://docs.aws.amazon.com/athena/latest/ug/data-types.html) for possible values.

Example Config

```json
"parameters": {
  "sqlConfig": {
    "outputs": {
      "myQueryOutput": {
        "query": "select * from myinput"
      }
    },
    "inputs": {
      "myinput": {
        "columnTypes": {
          "someIntegerColumn": "INTEGER"
        }
      }
    }
  }
}
```

### Security Scan

Allows you to scan input files for malware and viruses

| | |
| ---- | --- |
| **method name** | securityscan |
| **granularity** | once |
| **code** | [SecurityScan.ts](src/processors/SecurityScan.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | No outputs, scan info is put in the results |
| **config property name** | scanConfig |

`scanConfig` has the following properties:
* failOnAnyFinding - Fail the job if anything is found, defaults to false.
* scanTool - `scanii` or `clamav`, defaults to `scanii`.
* byInput - optional settings, keys are by input name,
  * failOnFinding - fail job if this input has a finding
* inputs - Optional property, should one entry per intput name that needs additonal config
  * columnTypes - Optional property to define non-string column types for certain columns in the input.  See [Athena Data Types](https://docs.aws.amazon.com/athena/latest/ug/data-types.html) for possible values.

Example Config

```json
"parameters": {
  "scanConfig": {
    "byInput": {
      "myInput": {
        "failOnFinding": true
      }
    },
    "scanTool": "clamav"
  }
}
```