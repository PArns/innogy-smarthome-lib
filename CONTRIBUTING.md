# Contributing

## Project Scope

The innogy-smarthome-lib project tries to provide a JavaScript library that utilizes the Innogy SmartHome client API. The library abstracts the token management, metadata buffering, and correct error code handling away from the developer. It's goal is to provide an easy access to the Innogy SmartHome client API without limiting the possibilities for the developer. The common things should be as easy (and fool proof) as possible, however, in general *any* kind of usage should be possible.

## Code License

This is an open source project falling under the MIT License. By using, distributing, or contributing to this project, you accept and agree that all code within the innogy-smarthome-lib project are licensed under MIT license.

## Working on the Project

### Issue Discussion

Discussion of issues should be placed transparently in the [issue tracker](https://github.com/PArns/innogy-smarthome-lib/issues) here on GitHub.

### Modifying the code

1. Fork and clone the repo.
2. First try to resolve the dependencies and build the libray.
3. Then see if you get the unit tests running.
4. Now you are ready to start with modifications.

### Development Workflow

1. If no issue already exists for the work you'll be doing, create one to document the problem(s) being solved and self-assign.
2. Otherwise please let us know that you are working on the problem. Regular status updates (e.g. "still in progress", "no time anymore", "practically done", "pull request issued") are highly welcome.
2. Create a new branch - please don't work in the `master` branch directly. It is reserved for releases. We recommend naming the branch to match the issue being addressed (`feature-#777` or `issue-777`), but you can also give it a custom name, e.g., `my-awesome-feature`.
3. Add failing tests for the change you want to make. Tests are crucial and need to be provided when submitting changes.
4. Fix stuff. Always go from edge case to edge case.
5. All tests should pass now. Also your new implementation should not break existing tests.
6. Update the documentation to reflect any changes. (or document such changes in the original issue)
7. Push to your fork or push your issue-specific branch to the main repository, then submit a pull request against `devel`.

### Versioning

The rules of [semver](http://semver.org/) apply here, with the exception of pre-v1 versions.

Prior to version 1.0.0 we use the following scheme:

1. MINOR versions for reaching a feature milestone potentially combined with dramatic API changes
2. PATCH versions for refinements (e.g., bug fixes)

After releasing version 1.0.0 the scheme changes to become the standard semantic versioning:

1. MAJOR versions at maintainers' discretion following significant changes to the codebase (e.g., API changes)
2. MINOR versions for backwards-compatible enhancements (e.g., enhancements and additions)
3. PATCH versions for backwards-compatible bug fixes (e.g., bug fixes)