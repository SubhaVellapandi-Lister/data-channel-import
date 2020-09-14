# Contributing to the Built-Ins

The Data Channels built-ins are free for everyone to contribute to using an "inner source" model.  Built-ins should be generic enough that at least two projects can use them.

## Flow

1. Create an instance the [Data Channels Starter](https://github.com/Hobsons/data-channels-starter) for initial development of your processor
2. Develop and test your processor created from the starter
3. Fork this repository
4. Copy your processor class into the [src/processors](src/processors) directory
5. Update the generateHandler config in [index.ts](src/index.ts)
6. Deploy the built-in lambda to a sandbox account for testing, use [deploy.js](deploy.js) for an easy way to control your deploy
7. Test your built-in
8. Create a PR against this repo
9. After approval, merge, and let CI/CD process deploy to all environments

## Best Practices

* Do all one-time configuration in a `before_[method name]` method
* Expect configuration to be provided in a self-contained parameter that is the name of the method, plus "Config".  For example `sqlConfig` if your method name is `sql`.
* Support both row and once granularities where possible.  Default to row, and add a second method called `[method name]Once`.
* Put meaningful metrics into the output in an `after_[method name]` method

## Deployment

The built-ins lambda can be deployed to any AWS account.  See template.yml for a SAM template.  You can use and update the [deploy.js](deploy.js) script to make deployments easier.

See [deployment and security guide](https://github.com/Hobsons/data-channels/tree/develop/deploymentAndSecurity.md)