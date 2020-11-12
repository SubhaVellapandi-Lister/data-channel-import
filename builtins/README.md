# Built-in processors that will be usable for all data-channels channel configs

These processors will be tailored for accomplishing common tasks that are used by many projects. This repo is "inner-source", please share any ideas you have for future built-ins and request access to create PRs.

Built-ins are published on the `ss-data-channels-BuiltInProcessor` processor lambda. You can also deploy your own personal copy of this lambda:

```bash
# deploys lambda named ss-data-channels-BuiltInProcessor-[username]
$ AWS_PROFILE=myprofile npm run deploy-personal
```

Example step config that uses a built-in:

```json
{
  "translate": {
    "inputs": ["CourseCatalog->courses"],
    "method": "translate",
    "outputs": ["coursesTranslated->input"],
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

## Contributing to the Built-ins

See the [Contributing Guide](contributing.md)

## Function Usage Reference

### Echo

Echo's back any inputs it is given. Meant for testing things out.

|                          |                                         |
| ------------------------ | --------------------------------------- |
| **method name**          | echo                                    |
| **granularity**          | row                                     |
| **code**                 | [Echo.ts](src/processors/Echo.ts)       |
| **input name**           | Any input name you want, e.g. "data"    |
| **output name**          | Input name plus "Echo", e.g. "dataEcho" |
| **config property name** | echoConfig _(not required)_             |

You can provide multiple inputs if desired. Note that by default `echo` will put the first and last row of each input in the `outputs` section of the job result itself, in addition to creating the named output files. If you want `echo` to put all rows into the `outputs` section of the job then you must provide `echoConfig` with a property of `outputAllRows` set to true.

### Translate

Translate column names and row values from one string to another.

|                          |                                                   |
| ------------------------ | ------------------------------------------------- |
| **method name**          | translate                                         |
| **granularity**          | row                                               |
| **code**                 | [Translate.ts](src/processors/Translate.ts)       |
| **input name**           | Any input name you want, e.g. "data"              |
| **output name**          | Input name plus "Translate", e.g. "dataTranslate" |
| **config property name** | translateConfig , fileTranslateConfig, dynamicOutput, dynamicInput,                   multipleFileConfig, inputFileNames |

- `dynamicOutput` - boolean defaults to false, if true, the output files has been generated dynamically based on the input files

- `dynamicInput` - boolean defaults to false, if true, creates the dynamic input files for next flow / step

- `multipleFileConfig` - boolean, if false, then configuration requires `translateConfig`. If true, then configuration requires `fileTranslateConfig`, it will handle multiple configuration based on file specifications.

- `inputFileNames` - Array of strings that represent the list of files to be processed.

- `translateConfig` is required. Properties under translateConfig

  - columns - main config properties under `columns` are column names for keys, with objects as values. Each object supports the following:

    - headerMappings - map one header name to another
    - valueMappings - map values in one column from one thing to another
    - indexMappings - map header names based on index of the header in the file, starts at index 1.
    - saveIndexMappings - boolean defaults to false, if true, the translate processor will automatically update the channel config to save indexMappings to reflect the current order of column mappings. This should only be used when you need to support headerless csv files and the order of the columns is strictly enforced.
    - headerlessFile - boolean defaults to false, if true, it should output a header row based on indexMappings.
    - removeEmptyHeaders - boolean defaults to false, if true, then translate config should remove empty header column from in output.
    - removeUnmappedHeaders - boolean defaults to false, if true, then translate config should not remove unmapped header row based on indexMappings.

- `fileTranslateConfig` is required. Properties under fileTranslateConfig.
    - [fileName] - Example, if you are processing the users file, then we need to specify the `fileName` as `users`.
      - columns - main config properties under `columns` are column names for keys, with objects as values. Each object supports the following:

        - headerMappings - map one header name to another
        - valueMappings - map values in one column from one thing to another
        - indexMappings - map header names based on index of the header in the file, starts at index 1.
        - saveIndexMappings - boolean defaults to false, if true, the translate processor will automatically update the channel config to save indexMappings to reflect the current order of column mappings. This should only be used when you need to support headerless csv files and the order of the columns is strictly enforced.
        - headerlessFile - boolean defaults to false, if true, it should output a header row based on indexMappings.
        - removeEmptyHeaders - boolean defaults to false, if true, then translate config should remove empty header column from in output.
        - removeUnmappedHeaders - boolean defaults to false, if true, then translate config should not remove unmapped header row based on indexMappings.

Example Config using translateConfig

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

Example Config using fileTranslateConfig

```json
"parameters": {
  "fileTranslateConfig": {
    "users":{
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
    },
    "inputFileNames
  }
}
```

### Validate

Validate that column names are correct and rows contain valid values.

|                          |                                                 |
| ------------------------ | ----------------------------------------------- |
| **method name**          | validate                                        |
| **granularity**          | row                                             |
| **code**                 | [Validate.ts](src/processors/Validate.ts)       |
| **input name**           | Any input name you want, e.g. "data"            |
| **output name**          | Input name plus "Validate", e.g. "dataValidate" |
| **config property name** | validateConfig , fileValidateConfig, dynamicOutput, dynamicInput, multipleFileConfig    |

- `dynamicOutput` - boolean defaults to false, if true, the output files has been generated dynamically based on the input files

- `dynamicInput` - boolean defaults to false, if true, creates the dynamic input files for next flow / step

- `multipleFileConfig` - boolean, if false, then configuration requires `validateConfig`. If true, then configuration requires `fileValidateConfig`, it will handle multiple configuration based on file specifications.

- `validateConfig` is required. Properties under validateConfig:

  - columns - main config properties under `columns` are column names for keys, with objects as values. Each object supports the following:

    - required - boolean, invalid if column doesn't exist
    - validTypes - Array of valid data types, see code for all types
    - validWithWarningTypes - Array of strings that considered valid values but with a warning
    - validValues - Array of strings that represent valid values
    - warnIfNotValidValue - boolean, if invalid it represents with a warning
    - validWithWarningValues - Array of strings that considered valid values but with a warning
    - invalidIfBlank - boolean, row is invalid if the column has a blank value
    - warnIfBlank - boolean, if the column has a blank value it represents with a warning
    - dateTimeFormat - date format, that considered the column has valid format, see code for all date formats [ValidateDateFormat]
    - caseInSensitive - boolean, if true, validates the values using insensitive approach
    - compareField - string, compare the given field in the row ( for now its supports only for datetime type. if want to validate
      with current date , compare field would be given as `current_date`)
    - comparator - string, comparator operations for the fields to be compare. (for now its supports only for datetime type. see code for all comparsions [ValidateComparator])

  - discardInvalidRows - boolean defaults to false, throw away rows from data file if they are invalid
  - validStatusColumnName - string default to `Validation_Status`, other hand it will update the given status column name
  - validInfoColumnName - string default to `Validation_Info`, other hand it will update the given info column name
  - includeDataInLog - boolean default to flase, if true, include all the data columns in addition to the log columns
  - includeLogInData - boolean default to flase, if true, instead of separate log file, put log columns in the data file
  - logHeaders - Array of string, define headers in the log file that is generated
  - extraLogFile - file name, use a separate log file, put log columns in the named file defined here

- `fileValidateConfig` is required. Properties under fileValidateConfig:

  - [fileName] - Example, if you are processing the sections file, then we need to specify the `fileName` as `sections`.

    - columns - main config properties under `columns` are column names for keys, with objects as values. Each object supports the following:

      - required - boolean, invalid if column doesn't exist
      - validTypes - Array of valid data types, see code for all types
      - validWithWarningTypes - Array of strings that considered valid values but with a warning
      - validValues - Array of strings that represent valid values
      - warnIfNotValidValue - boolean, if invalid it represents with a warning
      - validWithWarningValues - Array of strings that considered valid values but with a warning
      - invalidIfBlank - boolean, row is invalid if the column has a blank value
      - warnIfBlank - boolean, if the column has a blank value it represents with a warning
      - dateTimeFormat - date format, that considered the column has valid format, see code for all date formats [ValidateDateFormat]
      - caseInSensitive - boolean, if true, validates the values using insensitive approach
      - compareField - string, compare the given field in the row ( for now its supports only for datetime type. if want to validate
        with current date , compare field would be given as `current_date`)
      - comparator - string, comparator operations for the fields to be compare. (for now its supports only for datetime type. see code for all comparsions [ValidateComparator])

    - discardInvalidRows - boolean defaults to false, throw away rows from data file if they are invalid
    - validStatusColumnName - string default to `Validation_Status`, other hand it will update the given status column name
    - validInfoColumnName - string default to `Validation_Info`, other hand it will update the given info column name
    - includeDataInLog - boolean default to flase, if true, include all the data columns in addition to the log columns
    - includeLogInData - boolean default to flase, if true, instead of separate log file, put log columns in the data file
    - logHeaders - Array of string, define headers in the log file that is generated
    - extraLogFile - file name, use a separate log file, put log columns in the named file defined here

See [Validate.ts](src/processors/Validate.ts) code for more many more advanced config options

Example Config using validateConfig

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
      },
      "birth_dt": {
         "required": true,
         "validTypes": ["datetime"],
         "InvalidIfBlank": false,
         "dateTimeFormat": "YYYY-MM-DD",
         "compareField": "current_date",
         "comparator": "lt",
      },
    },
    "discardInvalidRows": true,
    "includeDataInLog": true,
    "includeLogInData": false,
    "discardInvalidRows": true,
    "extraLogFile": "sectionsDataLog"
  }
}
```

Example Config using fileValidateConfig

```json
"parameters": {
  "fileValidateConfig": {
    "sections":{
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
        },
        "birth_dt": {
          "required": true,
          "validTypes": ["datetime"],
          "InvalidIfBlank": false,
          "dateTimeFormat": "YYYY-MM-DD",
          "compareField": "current_date",
          "comparator": "lt",
        },
      },
      "discardInvalidRows": true,
      "includeDataInLog": true,
      "includeLogInData": false,
      "discardInvalidRows": true,
      "extraLogFile": "sectionsDataLog"
    }
  }
}
```

### Sort

Sorts an input based on one or more columns

|                          |                                             |
| ------------------------ | ------------------------------------------- |
| **method name**          | sort                                        |
| **granularity**          | row                                         |
| **code**                 | [Sort.ts](src/processors/Sort.ts)           |
| **input name**           | Any input name you want, e.g. "data"        |
| **output name**          | Input name plus "Sorted", e.g. "dataSorted" |
| **config property name** | sortConfig                                  |

`sortConfig` contains a property for each input by input name. This property is a list of `[columnName]: string` objects. Each object has to have a `columnName` string property, and can also define a boolean for treating the column as a number, and for sorting in descending order.

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

|                          |                                              |
| ------------------------ | -------------------------------------------- |
| **method name**          | groupby                                      |
| **granularity**          | row                                          |
| **code**                 | [GroupBy.ts](src/processors/GroupBy.ts)      |
| **input name**           | Any input name you want, e.g. "data"         |
| **output name**          | Input name plus "Sorted", e.g. "dataGrouped" |
| **config property name** | groupByConfig                                |

`groupByConfig` contains two properties:

- header - Which column to group rows by
- mode - Either `rows` or `objects`
  - rows - grouped row will be a json object with `rows` and `headers` property. The rows property will be an array of string arrays. The headers property will be a string array of the headers from the file.
  - objects - grouped will be a json object with `rows` property that is an array of objects. Each object will have keys for the headers, and values for the row.

**IMPORTANT** GroupBy assumes that the data has already been sorted. If your data is not sorted, use the `sort` builtin as a prior step to `groupby`.

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

|                          |                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| **method name**          | diff                                                                                            |
| **granularity**          | row                                                                                             |
| **code**                 | [Diff.ts](src/processors/Diff.ts)                                                               |
| **input name**           | Any input name you want, e.g. "data"                                                            |
| **output name**          | Four outputs for every input. e.g. "dataAdded", "dataModified", "dataUnmodified", "dataDeleted" |
| **config property name** | Use input names as parameter keys, see example                                                  |

Diff will create four outputs for each input. These outputs can be used by subsequent steps as desired. Each input can specify it's own primary key columns that combined identify a unique row. This unique identifier is used to determine if a row was modified, deleted, added, or unmodified since the last time this job was run for the same tenant and channel.

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

|                     |                                                |
| ------------------- | ---------------------------------------------- |
| **outputFormat**    | The format of the output                       |
| **unmodifiedValue** | What unmodified values should be replaced with |

`outputFormat` values:

|                    |                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **newAll**         | Output all values from the new file                                                         |
| **newChangedOnly** | Output only values that have changed in the new file, replace others with `unmodifiedValue` |
| **oldAll**         | Output all values from the old file                                                         |
| **oldChangedOnly** | Output only values that have changed in the old file, replace others with `unmodifiedValue` |

Example modified config:

```json
{
  "parameters": {
    "testInput": {
      "primaryKeyColumns": ["id"],
      "modifiedOutput": {
        "outputFormat": "newChangedOnly",
        "unmodifiedValue": ""
      }
    }
  }
}
```

### SNS

Send an SNS notification out out with the basic info of the job. Note that this method could be duplicated and modified for lots of other SNS situations.

|                          |                                 |
| ------------------------ | ------------------------------- |
| **method name**          | sns                             |
| **granularity**          | once                            |
| **code**                 | [SNS.ts](src/processors/SNS.ts) |
| **input name**           | N/A                             |
| **output name**          | N/A                             |
| **config property name** | arn                             |

`arn` config property is just the ARN of the topic to be published to

```json
"arn": "arn:aws:sns:us-east-1:315912493465:um-data-channels-sns-stepOutput"
```

### Email (SES)

Send an email out with the basic info of the job. Note that this method could be duplicated and modified for lots of other email situations.

|                          |                                 |
| ------------------------ | ------------------------------- |
| **method names**         | email                           |
| **granularity**          | once                            |
| **code**                 | [SES.ts](src/processors/SES.ts) |
| **input name**           | N/A                             |
| **output name**          | N/A                             |
| **config property name** | emailConfig                     |

The `email` method defaults to sending out a small generic subject and body with the pertinent details of the job. You can easily override the subject and body using a template system if desired. Template strings can use `${job.X}` template variables to fill in job details, where `job` is of type [IJobConfig](https://dcsdk-dev.hesos.net/interfaces/_types_job_.ijobconfig.html).

`emailConfig` takes the following properties:

- `to` - property which is either a string of an email address, or a list of email addresses.
- `failureOnly` - optional property, if true, will only send the email if the job failed on a prior step (must be used with `alwaysRun` set to true of the email step)
- `successOnly` - optional property, is the inverse of failureOnly property.
- `sendFilter` - lodash compatible path to lookup in the IJobConfig. If looked up value is truthy, send the email, otherwise do not send the email.
- `template` - custom template for the subject and body
  - `body` - template string to be used for the body
  - `subject` - template string to be used for the subject
  - `isHtml` - boolean to specify if body should be sent as html, defaults to false

```json
"emailConfig": {
  "to": ["someone@somewhere.com"],
  "failureOnly": true
}
```

or with template

```json
"emailConfig": {
  "to": ["someone@somewhere.com"],
  "failureOnly": true,
  "template": {
    "subject": "Data Channels Job - ${job.name} - ${job.status}",
    "body": "Job has ${job.status} ${job.statusMsg}\n\nStep Results:\n\n${job.steps}",
  }
}
```

### ThrowError

Immediately throws an error. Useful for testing `alwaysRun` property on subsequent steps in channel config.

|                          |                                               |
| ------------------------ | --------------------------------------------- |
| **method name**          | throwError                                    |
| **granularity**          | row, once                                     |
| **code**                 | [ThrowError.ts](src/processors/ThrowError.ts) |
| **input name**           | N/A                                           |
| **output name**          | N/A                                           |
| **config property name** | N/A                                           |

### SQL / Athena

Allows you to run SQL queries against inputs and create outputs from the resulting queries.

|                          |                                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| **method name**          | sql                                                                |
| **granularity**          | once                                                               |
| **code**                 | [Athena.ts](src/processors/Athena.ts)                              |
| **input name**           | Any input name you want, e.g. "data"                               |
| **output name**          | Any output name you want, must match the query name in your config |
| **config property name** | sqlConfig                                                          |

`sqlConfig` has one required and one optional properties:

- outputs - Required property should contain one entry per output name
  - query - The query to run to produce the output
- inputs - Optional property, should one entry per intput name that needs additonal config
  - columnTypes - Optional property to define non-string column types for certain columns in the input. See [Athena Data Types](https://docs.aws.amazon.com/athena/latest/ug/data-types.html) for possible values.

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

### Glue _BETA_

Allows you to dump tables and run queries against AWS Glue databases. Currently you need to setup your glue database, tables, and job role beforehand. This setup may be done automatically by this method in the future.

|                          |                                                  |
| ------------------------ | ------------------------------------------------ |
| **method name**          | glue                                             |
| **granularity**          | once                                             |
| **code**                 | [Glue.ts](src/processors/Glue.ts)                |
| **input name**           | No inputs, glue method is currently export only  |
| **output name**          | Any output name you want, must match your config |
| **config property name** | glueConfig                                       |

`glueConfig` is a map of ouput names to configurations. Each configuration needs the following:

- glue - Required property for glue info
  - databaseName - String name of the glue database to query against
  - connections - String list of names of glue connections needed
- etlJob
  - roleArn - ARN of the role that the job should use to run. This role needs glue access, cloudwatch access, and s3 read access to the script location (`arn:aws:s3:::data-channels-work*/workspace/glue/*` for default script location)
  - dumpTableName - Either this or sqlTableNames + sqlQuery are required. If set, it should be the name of a glue table to export into csv as the output
  - sqlTableNames - Either this and sqlQuery or dumpTableName are required. If set, the names of all the glue tables to be used in the sqlQuery.
  - sqlQuery - Full SQL query to run against the glue database
  - numWorkers - Number of workers to use for the job run, defaults to the minimum of two
  - workerType - Defaults to G.1X
  - scriptS3Location - Full s3 path the the spark script to run. Not needed if you are using dumpTableName or sqlQuery

Example dump table Config

```json
"parameters": {
  "glueConfig": {
    "myOutput": {
      "glue": {
        "databaseName": "SomeGlueDatabase",
        "connections": ["SomeConnectionName"]
      },
      "etlJob": {
        "roleArn": "arn:aws:iam::315912493465:role/ss-my-role-name",
        "dumpTableName": "MyTableToDump"
      }
    }
  }
}
```

Example SQL Query Config

```json
"parameters": {
  "glueConfig": {
    "myOutput": {
      "glue": {
        "databaseName": "SomeGlueDatabase",
        "connections": ["SomeConnectionName"]
      },
      "etlJob": {
        "roleArn": "arn:aws:iam::315912493465:role/ss-my-role-name",
        "sqlTableNames": ["MyTableToDump"],
        "sqlQuery": "select guid, name from MyTableToDump"
      }
    }
  }
}
```

### Security Scan

Allows you to scan input files for malware and viruses

|                          |                                                   |
| ------------------------ | ------------------------------------------------- |
| **method name**          | securityscan                                      |
| **granularity**          | once                                              |
| **code**                 | [SecurityScan.ts](src/processors/SecurityScan.ts) |
| **input name**           | Any input name you want, e.g. "data"              |
| **output name**          | No outputs, scan info is put in the results       |
| **config property name** | scanConfig                                        |

`scanConfig` has the following properties:

- failOnAnyFinding - Fail the job if anything is found, defaults to false.
- scanTool - `scanii` or `clamav`, defaults to `scanii`.
- byInput - optional settings, keys are by input name,
  - failOnFinding - fail job if this input has a finding

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

### Webhook

Allows you to call a webhook with provided information

|                          |                                         |
| ------------------------ | --------------------------------------- |
| **method name**          | webhook                                 |
| **granularity**          | once                                    |
| **code**                 | [Webhook.ts](src/processors/Webhook.ts) |
| **input name**           | N/A                                     |
| **output name**          | Any output name you want                |
| **config property name** | webhookConfig                           |

`webhookConfig` has the following properties:

- url - url of the webhook to be called.
- method - http verb for making a request: GET| POST | PUT | PATCH | DELETE.
- headers - optional headers to attatch with request
- body - request payload in case of post/put/patch/delete method
- timeout - Request cancellation after specified number of milliseconds

Example Config

```json
"parameters": {
        "webhookConfig": {
          "url": "https://jsonplaceholder.typicode.com/posts/1",
          "method": "POST",
          "headers": {
            "Content-Type": "Application/Json"
          },
          "body": {
            "title": "titan",
            "body": "quick brown fox"
          },
          "timeout": 30000,
        }
      }
```
