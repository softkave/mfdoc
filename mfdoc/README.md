# `mfdoc`

## Installation

```bash
npm install mfdoc
pnpm add mfdoc
yarn add mfdoc
```

## `mfdoc` CLI

A CLI tool to generate JS SDK and HTTP API documentation from your codebase.

### General Usage

```bash
mfdoc <command> [options]
```

### Commands

#### `setup-js-sdk`

Setup JS SDK for a project.

```bash
mfdoc setup-js-sdk <project-path> [options]
```

**Arguments:**

- `<project-path>` - Path to the project directory

**Options:**

- `-n, --name <name>` - Name of the project
- `-p, --provider <provider>` - Package manager to use (`npm`, `yarn`, `pnpm`). Default: `npm`

**Example:**

```bash
mfdoc setup-js-sdk ./my-api -n "My API SDK" -p npm
```

#### `gen-js-sdk`

Generate JavaScript SDK from your HTTP API endpoints.

```bash
mfdoc gen-js-sdk <src-path> [options]
```

**Arguments:**

- `<src-path>` - Path to the source code directory

**Options:**

**String Matching (Exact Match):**

- `-t, --include-tags <tags>` - Tags to include (endpoints must have at least one). Comma-separated or multiple arguments. Exact string match only.
- `--ignore-tags <tags>` - Tags to ignore (endpoints with these tags are filtered out). Comma-separated or multiple arguments. Takes precedence over `--include-tags`. Exact string match only.
- `--include-paths <paths>` - Paths to include (endpoints must match at least one). Comma-separated or multiple arguments. Exact string match only.
- `--ignore-paths <paths>` - Paths to ignore. Comma-separated or multiple arguments. Exact string match only.
- `--include-names <names>` - Endpoint names to include (endpoints must match at least one). Comma-separated or multiple arguments. Exact string match only.
- `--ignore-names <names>` - Endpoint names to ignore. Comma-separated or multiple arguments. Exact string match only.

**Regexp Matching:**

- `--include-tags-regexp <pattern>` - Regexp patterns for tags to include. Can be specified multiple times. Format: `/pattern/flags`
- `--ignore-tags-regexp <pattern>` - Regexp patterns for tags to ignore. Can be specified multiple times. Format: `/pattern/flags`
- `--include-paths-regexp <pattern>` - Regexp patterns for paths to include. Can be specified multiple times. Format: `/pattern/flags`
- `--ignore-paths-regexp <pattern>` - Regexp patterns for paths to ignore. Can be specified multiple times. Format: `/pattern/flags`
- `--include-names-regexp <pattern>` - Regexp patterns for endpoint names to include. Can be specified multiple times. Format: `/pattern/flags`
- `--ignore-names-regexp <pattern>` - Regexp patterns for endpoint names to ignore. Can be specified multiple times. Format: `/pattern/flags`

**Other Options:**

- `-o, --output-path <output-path>` - Path where the generated SDK will be saved
- `-e, --endpoints-path <endpoints-path>` - Endpoints path relative to output path. Defaults to `./src/endpoints`
- `-f, --filename-prefix <filename-prefix>` - Prefix for generated SDK filenames

**Example:**

```bash
# Include only endpoints with "public" or "api" tags (exact match)
mfdoc gen-js-sdk ./src -t "public,api" -o ./sdk -f "my-api"

# Include endpoints with "public" tag, but ignore those with "deprecated" tag
mfdoc gen-js-sdk ./src -t "public" --ignore-tags "deprecated" -o ./sdk -f "my-api"

# Include endpoints matching a regexp pattern for tags
mfdoc gen-js-sdk ./src --include-tags-regexp "/^v[0-9]+$/" -o ./sdk -f "my-api"

# Include multiple regexp patterns for tags
mfdoc gen-js-sdk ./src --include-tags-regexp "/^v[0-9]+$/" --include-tags-regexp "/^beta/" -o ./sdk -f "my-api"

# Include only specific paths using regexp
mfdoc gen-js-sdk ./src --include-paths-regexp "/api/v1/.*" -o ./sdk -f "my-api"

# Ignore specific paths using regexp
mfdoc gen-js-sdk ./src -t "public" --ignore-paths-regexp "/admin/.*" -o ./sdk -f "my-api"

# Include endpoints by name pattern using regexp
mfdoc gen-js-sdk ./src --include-names-regexp "/^files\\./.*" -o ./sdk -f "my-api"

# Combine string and regexp matching (e.g., exact path match + regexp pattern)
mfdoc gen-js-sdk ./src --include-paths "/api/v1/users" --include-paths-regexp "/api/v1/.*" --ignore-paths-regexp "/admin/.*" -o ./sdk -f "my-api"
```

#### `gen-http-api-endpoints-info`

Generate detailed information about HTTP API endpoints.

```bash
mfdoc gen-http-api-endpoints-info <src-path> [options]
```

**Arguments:**

- `<src-path>` - Path to the source code directory

**Options:**

**String Matching (Exact Match):**

- `-t, --include-tags <tags>` - Tags to include (endpoints must have at least one). Comma-separated or multiple arguments. Exact string match only.
- `--ignore-tags <tags>` - Tags to ignore (endpoints with these tags are filtered out). Comma-separated or multiple arguments. Takes precedence over `--include-tags`. Exact string match only.
- `--include-paths <paths>` - Paths to include (endpoints must match at least one). Comma-separated or multiple arguments. Exact string match only.
- `--ignore-paths <paths>` - Paths to ignore. Comma-separated or multiple arguments. Exact string match only.
- `--include-names <names>` - Endpoint names to include (endpoints must match at least one). Comma-separated or multiple arguments. Exact string match only.
- `--ignore-names <names>` - Endpoint names to ignore. Comma-separated or multiple arguments. Exact string match only.

**Regexp Matching:**

- `--include-tags-regexp <pattern>` - Regexp patterns for tags to include. Can be specified multiple times. Format: `/pattern/flags`
- `--ignore-tags-regexp <pattern>` - Regexp patterns for tags to ignore. Can be specified multiple times. Format: `/pattern/flags`
- `--include-paths-regexp <pattern>` - Regexp patterns for paths to include. Can be specified multiple times. Format: `/pattern/flags`
- `--ignore-paths-regexp <pattern>` - Regexp patterns for paths to ignore. Can be specified multiple times. Format: `/pattern/flags`
- `--include-names-regexp <pattern>` - Regexp patterns for endpoint names to include. Can be specified multiple times. Format: `/pattern/flags`
- `--ignore-names-regexp <pattern>` - Regexp patterns for endpoint names to ignore. Can be specified multiple times. Format: `/pattern/flags`

**Other Options:**

- `-o, --output-path <output-path>` - Path where the generated endpoint info will be saved

**Example:**

```bash
# Include only endpoints with "v1" or "public" tags (exact match)
mfdoc gen-http-api-endpoints-info ./src -t "v1,public" -o ./docs/endpoints.json

# Include endpoints with "public" tag, but ignore those with "deprecated" tag
mfdoc gen-http-api-endpoints-info ./src -t "public" --ignore-tags "deprecated" -o ./docs/endpoints.json

# Include only specific paths using regexp
mfdoc gen-http-api-endpoints-info ./src --include-paths-regexp "/api/v1/.*" -o ./docs/endpoints.json

# Ignore specific paths using regexp (multiple patterns)
mfdoc gen-http-api-endpoints-info ./src -t "public" --ignore-paths-regexp "/admin/.*" --ignore-paths-regexp "/internal/.*" -o ./docs/endpoints.json

# Include endpoints by name pattern using regexp
mfdoc gen-http-api-endpoints-info ./src --include-names-regexp "/^files\\./.*" -o ./docs/endpoints.json
```

### Common Workflow

1. **Setup**: Use `setup-js-sdk` to initialize your project structure
2. **Generate SDK**: Use `gen-js-sdk` to create a JavaScript SDK for your API
3. **Extract Endpoint Info**: Use `gen-http-api-endpoints-info` to get detailed endpoint information

### Filtering Options

The filtering options allow you to control which endpoints are processed:

#### String Matching (Exact Match)

String options perform exact string matching. They can be provided as:

- Comma-separated values: `--include-tags "tag1,tag2,tag3"`
- Multiple arguments: `--include-tags tag1 --include-tags tag2 --include-tags tag3`

**String Options:**

- **`--include-tags`**: Endpoints must have at least one of the specified tags to be included. If not specified, all endpoints are considered (unless other filters apply).
- **`--ignore-tags`**: Endpoints with any of the specified tags are excluded. This takes precedence over `--include-tags`.
- **`--include-paths`**: Include only endpoints matching at least one of the specified paths (exact match). If not specified, all paths are considered (unless other filters apply).
- **`--ignore-paths`**: Exclude endpoints matching the specified paths (exact match).
- **`--include-names`**: Include only endpoints matching at least one of the specified names (exact match). Endpoint names are derived from the endpoint path or name property. If not specified, all names are considered (unless other filters apply).
- **`--ignore-names`**: Exclude endpoints matching the specified names (exact match). Endpoint names are derived from the endpoint path or name property.

#### Regexp Matching

Regexp options use regular expression patterns. They must be provided as multiple arguments (not comma-separated):

- `--include-tags-regexp "/pattern1/" --include-tags-regexp "/pattern2/"`

**Regexp Options:**

- **`--include-tags-regexp`**: Regexp patterns for tags to include. Can be specified multiple times.
- **`--ignore-tags-regexp`**: Regexp patterns for tags to ignore. Can be specified multiple times.
- **`--include-paths-regexp`**: Regexp patterns for paths to include. Can be specified multiple times.
- **`--ignore-paths-regexp`**: Regexp patterns for paths to ignore. Can be specified multiple times.
- **`--include-names-regexp`**: Regexp patterns for endpoint names to include. Can be specified multiple times.
- **`--ignore-names-regexp`**: Regexp patterns for endpoint names to ignore. Can be specified multiple times.

**Regexp Format:**
Regexp patterns must be wrapped in forward slashes with optional flags:

- `/pattern/` - Basic regex pattern
- `/pattern/i` - Case-insensitive matching
- `/pattern/g` - Global matching (for patterns that need it)

**Examples:**

- `"public"` (string option) - Exact string match for "public"
- `"/^v[0-9]+$/"` (regexp option) - Matches version tags like "v1", "v2", etc.
- `"/admin/.*/"` (regexp option) - Matches paths starting with "/admin/"

**Use Cases:**

- Generating separate SDKs for different API versions
- Creating documentation for specific feature sets
- Filtering public vs internal endpoints
- Excluding deprecated or experimental endpoints
- Filtering by endpoint paths or names

### Help

For more information about any command, use the help flag:

```bash
mfdoc --help
mfdoc <command> --help
```

### Documentation
