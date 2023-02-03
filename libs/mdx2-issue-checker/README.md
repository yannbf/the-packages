### mdx2-issue-checker

This package is a simple tool to check for issues in the MDX2 files.
It's a wrapper of [`remark-cli`](https://github.com/remarkjs/remark/tree/main/packages/remark-cli) which uses the [`remark-mdx`](https://github.com/mdx-js/mdx/tree/main/packages/remark-mdx) plugin to check your `.mdx` files.

## Usage:

Default usage - Will check all the files in the current directory:

```sh
npx @hipster/mdx2-issue-checker
```

Specify a directory to check:

```sh
npx @hipster/mdx2-issue-checker /path/to/directory
```

Verbose mode - By default, it will only display the files with errors. If you want to see all files which the CLI has gone through, you can use the `--verbose` flag:

```sh
npx @hipster/mdx2-issue-checker --verbose
```