import { rmdirSync } from "fs";
import tar from "tar";

tar.extract({
    file: 'package.tgz',
    sync: true
});

rmdirSync('package/clamav', { recursive: true });
rmdirSync('package/node_modules', { recursive: true });

tar.create(
    {
        gzip: true,
        sync: true,
        file: 'package.tgz'
    },
    ["package/"]
);

rmdirSync('package/', { recursive: true });
