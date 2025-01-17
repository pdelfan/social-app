# Testing instructions

### Using Maestro E2E tests
1. Install Maestro by following [these instuctions](https://maestro.mobile.dev/getting-started/installing-maestro). This will help us run the E2E tests.
2. You can write Maestro tests in `__e2e__/maestro` directory by creating a new `.yaml` file or by modifying an existing one.
3. You can also use [Maestro Studio](https://maestro.mobile.dev/getting-started/maestro-studio) which automatically generates commands by recording your actions on the app. Therefore, you can create realistic tests without having to manually write any code. Use  the `maestro studio` command to start recording your actions.


### Using Flashlight for Performance Testing
1. Make sure Maestro is installed (optional: only for auomated testing) by following the instructions above
2. Install Flashlight by following [these instructions](https://docs.flashlight.dev/)
3. The simplest way to get started is by running `yarn perf:measure` which will run a live preview of the performance test results. You can [see a demo here](https://github.com/bamlab/flashlight/assets/4534323/4038a342-f145-4c3b-8cde-17949bf52612)
4. The `yarn perf:test:measure` will run the `scroll.yaml` test located in `__e2e__/maestro/scroll.yaml` and give the results in `.perf/results.json` which can be viewed by running `yarn:perf:results`
5. You can also run your own tests by running `yarn perf:test <path_to_test>` where `<path_to_test>` is the path to your test file. For example, `yarn perf:test __e2e__/maestro/scroll.yaml` will run the `scroll.yaml` test located in `__e2e__/maestro/scroll.yaml`.