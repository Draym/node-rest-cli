#! /usr/bin/env node
const fs = require('fs');

const DataTypes = {
    STRING: "string",
    BOOLEAN: "boolean",
    NUMBER: "number",
    INTEGER: "number",
    DATE: "Date",
    DECIMAL: function (precision, scale) {
        return `string`
    }
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

export type ${model}CreationAttributes = Optional<${model}, "${ignoredKeys.join(" | ")}">
    
export default class ${model}Model extends Model<${model}, ${model}CreationAttributes> implements ${model} {
${properties}
}

export const init = (sequelize: Sequelize): typeof ${model}Model => {
    // Init all models
    ${model}Model.init(${config.seq},
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
    const content = `import db, {sequelize} from "../db/database"
import {${model}Model} from "../models"
import Errors from "../utils/errors/Errors"
import {Filter, throwIf, throwIfNot, throwIfNull, replaceAll} from "@d-lab/api-kit"

export default class ${model}Service {
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
    let content
    if (fs.existsSync('./src/interfaces/index.ts')) {
        content = fs.readFileSync('./src/interfaces/index.ts')
    } else {
        content = `
export {
}
`
    }
    const model = name.model
    // add import
    content = `import ${model} from "./${name.min}.interface"\n` + content
    // add export
    const start = content.indexOf(`export {`)
    content = content.slice(0, start + 8) + "\n\t" + model + "," + content.slice(start + 8)
    fs.writeFileSync(`./src/interfaces/index.ts`, content)
    console.log("- Interface: \x1b[32mindex ok\x1b[0m")
}
function updateModelIndex(name) {
    let content
    if (fs.existsSync('./src/models/index.ts')) {
        content = fs.readFileSync('./src/models/index.ts')
    } else {
        content = `
export {
}
`
    }
    const model = name.model + "Model"
    // add import
    content = `import ${model} from "./${name.min}.model"\n` + content
    // add export
    const start = content.indexOf(`export {`)
    content = content.slice(0, start + 8) + "\n\t" + model + "," + content.slice(start + 8)
    fs.writeFileSync(`./src/models/index.ts`, content)
    console.log("- Model: \x1b[32mindex ok\x1b[0m")
}

function updateServiceIndex(name) {
    let content
    if (fs.existsSync('./src/services/index.ts')) {
        content = fs.readFileSync('./src/services/index.ts')
    } else {
        content = `
export {
}
`
    }
    // add import
    const model = name.model + "Service"
    content = `import ${model} from "./${name.min}.service"\n` + content
    // add new
    const start1 = content.indexOf(`export {`)
    content = content.slice(0, start1) + `const ${uncapitalize(model)} = new ${model}()\n` + content.slice(start1)
    // add export
    const start2 = content.indexOf(`export {`)
    content = content.slice(0, start2 + 8) + "\n\t" + model + "," + content.slice(start2 + 8)
    fs.writeFileSync(`./src/services/index.ts`, content)
    console.log("- Service: \x1b[32mindex ok\x1b[0m")
}

function prettify(name) {
    return name.toLowerCase()
        .replace("-", " ")
        .replace("_", " ")
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(" ", "")
}

function uncapitalize(name) {
    return name.charAt(0).toLowerCase() + name.slice(1)
}

function getModelName(data) {
    const start = data.indexOf(`("`)
    const end = data.indexOf(`", {`, start)
    let raw = data.substring(start + 2, end)
    let name = raw.toString()
    if (name.at(name.length - 2) !== "s") {
        name = name.substring(0, name.length - 1)
    }
    return {
        raw: raw,
        min: name,
        model: prettify(name),
        db: prettify(raw)
    }
}

function getModelProperties(data) {
    const start = data.indexOf(`", {`)
    const end = data.indexOf(`})`, start)
    const payload = `{${data.substring(start + 4, end)}}`
    const obj = eval('(' + payload + ')')
    const keys = Object.keys(obj)
    return {
        seq: payload,
        obj: keys.reduce((result, key) => {
            result[uncapitalize(prettify(key))] = obj[key]
            return result
        }, {})
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
        createService(name, config)
        updateServiceIndex(name)
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