import fs from 'fs'

import { CLIError } from '@oclif/errors'
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
	throw new CLIError(`missing required file: ${filename}`)
}

export const requireDir = (dirName: string): string => {
	if (isDir(dirName)) {
		return dirName
	}
	throw new CLIError(`missing required directory: ${dirName}`)
}

// using `object` because it is what `yaml.safeLoad` used to return
// eslint-disable-next-line @typescript-eslint/ban-types
export const readYAMLFile = (filename: string, errorMessage?: string): string | object | undefined => {
	try {
		// ISSUE: do more validation here and fix return type
		return yaml.load(fs.readFileSync(filename, 'utf-8')) as string | object | undefined
	} catch (error) {
		throw new CLIError((errorMessage ?? 'error "{error}" reading {filename}')
			.replace('{filename}', 'filename')
			.replace('{error}', `${error}`))
	}
}
