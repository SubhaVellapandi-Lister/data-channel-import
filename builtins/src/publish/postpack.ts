//import fs from ;
import { rmdirSync } from "fs";

import tar from "tar";

// Extract package made by `yarn pack`.
tar.extract({
    file: 'package.tgz',
    sync: true
});

rmdirSync('package/clamav', { recursive: true });
rmdirSync('package/node_modules', { recursive: true });

// Recreate package archive.
tar.create(
    {
        gzip: true,
        sync: true,
        file: 'package.tgz'
    },
    ["package/"]
);

rmdirSync('package/', { recursive: true });
