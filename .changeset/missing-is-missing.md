---
'@runa-cmd/core': patch
---

A required value that's missing says so, whatever its type. A missing `z.enum` or `z.literal` said `Invalid value for --env. Expected one of: staging, production`, so the main example of the README didn't give the error the same page promises. Now it's `Missing required option: --env, or set DEPLOY_ENV`, as for any other type, and a missing enum argument, as the shell of `completions`, is `Missing required argument: <shell>`. A wrong value is still an invalid value.
