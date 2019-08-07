## Build ZIP package from docker

Note that this is necessary because apSDK has non-JS dependencies that need to be built on linux in order to be importable on AWS lambda.

```bash
$ docker build --build-arg repoPassword=[repo pw] -t cpimport

$ docker run --rm --entrypoint cat cpimport /usr/src/app/cpimport.zip > cpimport.zip

```

