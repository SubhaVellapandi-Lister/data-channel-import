# Built-in processors that will be usable for all data-channels channel configs

These processors will be tailored for accomplishing common tasks that are used by many projects.

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

### Sort

Sorts an input based on one or more columns

| | |
| ---- | --- |
| **method name** | sort |
| **code** | [Sort.ts](src/processors/Sort.ts) |
| **input name** | Any input name you want, e.g. "data" |
| **output name** | Input name plus "Sorted", e.g. "dataSorted" |
| **config property name** | sortConfig |

`sortConfig` contains a property for each input by input name.  This property is a list of `[columnName]: string` objects.  Each object has to have a `columnName` string property, and can also define a boolean for treating the column as a nubmer, and for sorting in descending order  |

Example Config

```json
"parameters": {
  "sortConfig": [
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
```


| Method Name     | Description  | Example Parameters
|-----------------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Sort | Sort the rows of one or more files by one or more columns | '{ "sortConfig": { "myInput": [ { "columnName": "myColumn" } ]}}' |
| Translate | Rename columns or modify row contents based on configuration | '{ "translateConfig": { "valueMappings": {"CTE": [ { "toValue": "", "fromValue": "N" } ] }}}' |
| Validate | Preform basic column validation based on configuration | '{ "validateConfig": { "columns": { "CTE": { "validValues": ["Y", "N"] }, "Credits": { "required": true, "validTypes": [ "decimal" ], "invalidIfBlank": true }}}}' |

See code under [processors](src/processors) directory for the defined configuration interfaces.

More methods are currently in progress, such as merge, diff, and SNS notifications.


## Build ZIP package from docker

*Advanced use cases only*

```bash
$ docker build --build-arg repoPassword=[repo pw] -t dcbuiltins .

$ docker run --rm --entrypoint cat dcbuiltins /usr/src/app/dcbuiltins.zip > dcbuiltins.zip

```

