#! /usr/bin/env node
const fs = require('fs');

const DataTypes = {
    UUID: "string",
    UUIDV4: "string",
    STRING: "string",
    BOOLEAN: "boolean",
    NUMBER: "number",
    INTEGER: "number",
    DATE: "Date",
    DECIMAL: function (precision, scale) {
        return "string"
    },
    JSON: "string"
}

const ignoredKeys = ["id", "createdAt", "updatedAt"]

function createModel(name, config) {
    const filename = `${name.min}.model.ts`
    const model = name.model
    const properties = Object.keys(config.obj).map(key => {
        const hasNull = config.obj[key].allowNull ? " | null" : ""
        return `\tpublic ${key}: ${config.obj[key].type}${hasNull}`
    }).join("\n")
    const content = `import {Model, DataTypes, Sequelize, Optional} from "sequelize"
import {${model}} from "../interfaces"

export type ${model}CreationAttributes = Optional<${model}, "${ignoredKeys.join("\" | \"")}">

export default class ${model}Model extends Model<${model}, ${model}CreationAttributes> implements ${model} {
${properties}
}

export const init = (sequelize: Sequelize): typeof ${model}Model => {
    // Init all models
    ${model}Model.init(${config.seqFormatted},
    {
        underscored: true,
        modelName: "${name.raw}",
        sequelize,
        timestamps: true
    })
    return ${model}Model
}`
    fs.writeFileSync(`./src/models/${filename}`, content)
    console.log("- Model: \x1b[32mcode ok\x1b[0m")
}

function createInterface(name, config) {
    const filename = `${name.min}.interface.ts`
    const properties = Object.keys(config.obj).map(key => {
        const hasNull = config.obj[key].allowNull ? " | null" : ""
        return `\t${key}: ${config.obj[key].type}${hasNull}`
    }).join("\n")
    const content = `export default interface ${name.model} {
${properties}
}`
    fs.writeFileSync(`./src/interfaces/${filename}`, content)
    console.log("- Interface: \x1b[32mcode ok\x1b[0m")
}

function createRepo(name, config) {
    const filename = `${name.min}.repo.ts`
    const db = name.db
    const model = name.model
    const parameters = Object.keys(config.obj).map(key => {
        if (ignoredKeys.includes(key)) {
            return null
        }
        const hasNull = config.obj[key].allowNull ? " | null" : ""
        return `${key}: ${config.obj[key].type}${hasNull}`
    }).filter(it => it != null).join(", ")

    const payload = Object.keys(config.obj).map(key => {
        if (ignoredKeys.includes(key)) {
            return null
        }
        return `\t\t\t${key}: ${key}`
    }).filter(it => it != null).join(",\n")
    const content = `import db from "../db/database"
import {${model}Model} from "../models"
import Errors from "../utils/errors/Errors"
import {Filter, throwIfNull} from "@d-lab/api-kit"

export default class ${model}Repo {
    public async getAll(): Promise<${model}Model[]> {
        return await db.${db}.findAll()
    }

    async findBy(filter: Filter): Promise<${model}Model | null> {
        return db.${db}.findOne(filter.get())
    }

    async getBy(filter: Filter): Promise<${model}Model> {
        const it = await this.findBy(filter)
        throwIfNull(it, Errors.NOT_FOUND_${model}(filter.stringify()))
        return it!
    }

    async findAll(filter: Filter): Promise<${model}Model[]> {
        return db.${db}.findAll(filter.get())
    }
    
    async find(id: number): Promise<${model}Model | null> {
        return db.${db}.findByPk(id)
    }
    
    async get(id: number): Promise<${model}Model> {
        const it = await this.find(id)
        throwIfNull(it, Errors.NOT_FOUND_${model}(\`id[\${id}\`))
        return it!
    }
}
`
    fs.writeFileSync(`./src/repositories/${filename}`, content)
    console.log("- Repo: \x1b[32mcode ok\x1b[0m")
}

function createService(name, config) {
    const filename = `${name.min}.service.ts`
    const db = name.db
    const model = name.model
    const parameters = Object.keys(config.obj).map(key => {
        if (ignoredKeys.includes(key)) {
            return null
        }
        const hasNull = config.obj[key].allowNull ? " | null" : ""
        return `${key}: ${config.obj[key].type}${hasNull}`
    }).filter(it => it != null).join(", ")

    const payload = Object.keys(config.obj).map(key => {
        if (ignoredKeys.includes(key)) {
            return null
        }
        return `\t\t\t${key}: ${key}`
    }).filter(it => it != null).join(",\n")
    const content = `import db from "../db/database"
import {${model}Model} from "../models"

export default class ${model}Service {
    
    async create(${parameters}): Promise<${model}Model> {
       return await db.${db}.create({
${payload}
        })
    }
}
`
    fs.writeFileSync(`./src/services/${filename}`, content)
    console.log("- Service: \x1b[32mcode ok\x1b[0m")
}

function updateInterfaceIndex(name) {
    const path = "./src/interfaces/index.ts"
    let content
    if (fs.existsSync(path)) {
        content = fs.readFileSync(path)
    } else {
        content = `
export {
}
`
    }
    const model = name.model
    if (content.indexOf(` ${model} `) === -1) {
        // add import
        content = `import ${model} from "./${name.min}.interface"\n` + content
        // add export
        const start = content.indexOf(`export {`)
        content = content.slice(0, start + 8) + "\n\t" + model + "," + content.slice(start + 8)
        fs.writeFileSync(path, content)
    }
    console.log("- Interface: \x1b[32mindex ok\x1b[0m")
}

function updateModelIndex(name) {
    const path = "./src/models/index.ts"
    let content
    if (fs.existsSync(path)) {
        content = fs.readFileSync(path)
    } else {
        content = `
export {
}
`
    }
    const model = name.model + "Model"
    if (content.indexOf(` ${model} `) === -1) {
        // add import
        content = `import ${model} from "./${name.min}.model"\n` + content
        // add export
        const start = content.indexOf(`export {`)
        content = content.slice(0, start + 8) + "\n\t" + model + "," + content.slice(start + 8)
        fs.writeFileSync(path, content)
    }
    console.log("- Model: \x1b[32mindex ok\x1b[0m")
}

function updateRepoIndex(name) {
    const path = "./src/repositories/index.ts"
    let content
    if (fs.existsSync(path)) {
        content = fs.readFileSync(path)
    } else {
        content = `
export {
}
`
    }
    const model = name.model + "Repo"

    if (content.indexOf(` ${model} `) === -1) {
        // add import
        content = `import ${model} from "./${name.min}.repo"\n` + content
        // add new
        const start1 = content.indexOf(`export {`)
        content = content.slice(0, start1 - 1) + `const ${uncapitalize(model)} = new ${model}()\n` + content.slice(start1 - 1)
        // add export
        const start2 = content.indexOf(`export {`)
        content = content.slice(0, start2 + 8) + `\n\t${uncapitalize(model)},` + content.slice(start2 + 8)
        fs.writeFileSync(path, content)
    }
    console.log("- Repo: \x1b[32mindex ok\x1b[0m")
}

function updateServiceIndex(name) {
    const path = "./src/services/index.ts"
    let content
    if (fs.existsSync(path)) {
        content = fs.readFileSync(path)
    } else {
        content = `
export {
}
`
    }
    const model = name.model + "Service"

    if (content.indexOf(` ${model} `) === -1) {
        // add import
        content = `import ${model} from "./${name.min}.service"\n` + content
        // add new
        const start1 = content.indexOf(`export {`)
        content = content.slice(0, start1 - 1) + `const ${uncapitalize(model)} = new ${model}()\n` + content.slice(start1 - 1)
        // add export
        const start2 = content.indexOf(`export {`)
        content = content.slice(0, start2 + 8) + `\n\t${uncapitalize(model)},` + content.slice(start2 + 8)
        fs.writeFileSync(path, content)
    }
    console.log("- Service: \x1b[32mindex ok\x1b[0m")
}

function updateDBInit(name) {
    const path = "./src/db/database.ts"
    let content
    if (fs.existsSync(path)) {
        content = fs.readFileSync(path)
    } else {
        content = `import {Dialect, Sequelize} from "sequelize"
import config from "../config/db.config"


export const connectionParams = {
    username: config.username,
    password: config.password,
    dialect: "mysql" as Dialect,
    database: config.database,
    host: config.host,
    port: config.port,
    pool: {
        min: 0,
        max: 5,
    },
    define: {
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci",
        underscored: true,
        freezeTableName: true,
    },
    timezone: "+08:00",
    logQueryParameters: process.env.NODE_ENV === "development",
    benchmark: true,
}

const sequelize = new Sequelize(connectionParams)
export {sequelize}

const db = {
}

export default db
`
    }
    const model = name.model
    if (content.indexOf(`init${model}Model`) === -1) {
        // add new
        const start1 = content.indexOf(`export const connectionParams`)
        content = content.slice(0, start1 - 1) + `import {init as init${model}Model} from "../models/${name.min}.model"\n` + content.slice(start1 - 1)
        // add export
        const start2 = content.indexOf(`const db = {`)
        content = content.slice(0, start2 + 12) + `\n\t${name.db}: init${model}Model(sequelize),` + content.slice(start2 + 12)
        fs.writeFileSync(path, content)
    }
    console.log("- Database: \x1b[32minject ok\x1b[0m")
}


function updateErrorUtil(name) {
    const path = "./src/utils/errors/Errors.ts"
    let content
    if (fs.existsSync(path)) {
        content = fs.readFileSync(path)
    } else {
        content = `import {ErrorCode} from "../../enums"
import {HttpException} from "@d-lab/api-kit"

const Errors = {
}

export default Errors
`
    }
    const model = name.model
    if (content.indexOf(`_${model}:`) === -1) {
        // add error
        const start1 = content.indexOf(`= {`)
        content = content.slice(0, start1 + 3) + `\n\tNOT_FOUND_${model}: (reason: string) => new HttpException(ErrorCode.NOT_FOUND_${model}, \`${model} not found for \${reason}\`),` + content.slice(start1 + 3)
        fs.writeFileSync(path, content)
    }
    console.log("- Errors: \x1b[32minject ok\x1b[0m")
}

function uncapitalize(word) {
    return word.charAt(0).toLowerCase() + word.slice(1)
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
}

function prettify(name) {
    name = name.toLowerCase()
    name = replaceAll(name, "-", " ")
    name = replaceAll(name, "_", " ")

    name = name
        .split(' ')
        .map(word => capitalize(word))
        .join(' ')
    return replaceAll(name, " ", "")
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function getModelName(data) {
    const start = data.indexOf(`("`)
    const end = data.indexOf(`", {`, start)
    let raw = data.substring(start + 2, end)
    let name = raw.toString()
    if (name.at(name.length - 1) === "s" && name.at(name.length - 2) !== "s") {
        name = name.substring(0, name.length - 1)
    }
    return {
        raw: raw,
        min: replaceAll(name, "_", "-"),
        model: prettify(name),
        db: prettify(raw)
    }
}

function getModelProperties(data) {
    const start = data.indexOf(`", {`)
    const end = data.indexOf(`})`, start)
    const payload = `{${data.substring(start + 4, end)}}`
    const json = eval('(' + payload + ')')
    const keys = Object.keys(json)
    const obj = keys.reduce((result, key) => {
        result[uncapitalize(prettify(key))] = json[key]
        return result
    }, {})
    const seqFormatted = keys.reduce((result, key) => {
        return result.replace(key, uncapitalize(prettify(key)))
    }, payload)
    return {
        seq: payload,
        seqFormatted: seqFormatted,
        obj: obj
    }
}

function generateFromDB(migration) {
    try {
        const data = fs.readFileSync(`./migrations/${migration}.ts`, 'utf8');
        const name = getModelName(data)
        const config = getModelProperties(data)
        createInterface(name, config)
        updateInterfaceIndex(name)
        createModel(name, config)
        updateModelIndex(name)
        createRepo(name, config)
        updateRepoIndex(name)
        createService(name, config)
        updateServiceIndex(name)
        updateDBInit(name)
        updateErrorUtil(name)
        console.log("## done.")
    } catch (err) {
        console.error(err);
    }
}

console.log("## Generate code for ", process.argv[2])
if (process.argv.length < 3) {
    console.log("Usage: add-model <migration-name>")
    process.exit(1)
}
generateFromDB(process.argv[2])