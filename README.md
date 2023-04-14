# `REST cli` ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) [![npm version](https://badge.fury.io/js/@d-lab%2Fnode-rest-cli.svg)](https://badge.fury.io/js/@d-lab%2Fnode-rest-cli)
CLI commands to build your REST API with fewer efforts.

[available on NPM](https://www.npmjs.com/package/@d-lab/node-rest-cli)

## Installation

```bash
npm i @d-lab/node-rest-cli --save-dev
```

## Usage

### Generate your models based on your migration file
   
Replace 01_create_users_table by your own migration files
```bash
npx add-model 01_create_users_table
```
- Generate
  - interfaces/{model}.interface.ts
  - models/{model}.model.ts
  - repositories/{model}.repo.ts
  - services/{model}.service.ts

- Update
  - interfaces/index.ts
  - models/index.ts
  - repositories/index.ts
  - services/index.ts