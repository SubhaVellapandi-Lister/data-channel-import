# Built-in processors that will be usable for all data-channels channel configs

These processors will be tailored for accomplishing common tasks that are used by many projects.

## Build ZIP package from docker

```bash
$ docker build --build-arg repoPassword=[repo pw] -t dcbuiltins .

$ docker run --rm --entrypoint cat dcbuiltins /usr/src/app/dcbuiltins.zip > dcbuiltins.zip

```

