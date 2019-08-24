## Build ZIP package from docker

Note that this is necessary because apSDK has non-JS dependencies that need to be built on linux in order to be importable on AWS lambda.

```bash
$ docker build --build-arg repoPassword=[repo pw] -t cpexport .

$ docker run --rm --entrypoint cat cpexport /usr/src/app/cpexport.zip > cpexport.zip

```

