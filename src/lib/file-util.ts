import fs from 'fs'

import { Errors } from '@oclif/core'
import yaml from 'js-yaml'


export const isFile = (filename: string): boolean =>
	fs.existsSync(filename) && fs.lstatSync(filename).isFile()

export const isDir = (filename: string): boolean =>
	fs.existsSync(filename) && fs.lstatSync(filename).isDirectory()

export const findYAMLFilename = (baseName: string): string | false => {
	let retVal = `${baseName}.yaml`
	if (isFile(retVal)) {
		return retVal
	}

	retVal = `${baseName}.yml`
	if (isFile(retVal)) {
		return retVal
	}

	return false
}

export const requireFile = (filename: string): string => {
	if (isFile(filename)) {
		return filename
	}
	throw new Errors.CLIError(`missing required file: ${filename}`)
}

export const requireDir = (dirName: string): string => {
	if (isDir(dirName)) {
		return dirName
	}
	throw new Errors.CLIError(`missing required directory: ${dirName}`)
}

export interface YAMLFileData {
	[key: string]: string | object | number | undefined
}

function isYAMLFileData(data: unknown): data is YAMLFileData {
	return data !== null &&
		typeof data === 'object' &&
		Object.keys(data).length > 0 &&
		Object.values(data).every(value => ['string', 'object', 'number'].includes(typeof value))
}

export const readYAMLFile = (filename: string): YAMLFileData => {
	try {
		const data = yaml.load(fs.readFileSync(filename, 'utf-8'))
		if (isYAMLFileData(data)) {
			return data
		}

		if (data == null) {
			throw new Error('empty file')
		}

		throw new Error('invalid file')
	} catch (error) {
		throw new Errors.CLIError(`error "${error.message}" reading ${filename}`)
	}
}
