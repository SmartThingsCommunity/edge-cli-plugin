import fs from 'fs'

import { CLIError } from '@oclif/errors'
import yaml from 'js-yaml'

import { findYAMLFilename, isDir, isFile, readYAMLFile, requireDir, requireFile } from '../../src/lib/file-util'


jest.mock('fs')
jest.mock('js-yaml')

describe('file-util', () => {
	const existsSyncMock = fs.existsSync as unknown as jest.Mock<boolean, [fs.PathLike]>
	const lstatSyncMock = fs.lstatSync as unknown as jest.Mock<fs.Stats, [fs.PathLike]>

	afterEach(() => {
		jest.clearAllMocks()
	})

	const mockExistsAndIsFile = (): void => {
		existsSyncMock.mockReturnValueOnce(true)
		const statsIsFileMock = jest.fn().mockReturnValueOnce(true)
		lstatSyncMock.mockReturnValueOnce({ isFile: statsIsFileMock } as unknown as fs.Stats)
	}

	const mockExistsAndIsDirectory = (): void => {
		existsSyncMock.mockReturnValueOnce(true)
		const statsIsDirectoryMock = jest.fn().mockReturnValueOnce(true)
		lstatSyncMock.mockReturnValueOnce({ isDirectory: statsIsDirectoryMock } as unknown as fs.Stats)
	}

	describe('isFile', () => {
		it('returns false if does not exist', () => {
			existsSyncMock.mockReturnValue(false)

			expect(isFile('non-existent.stl')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('non-existent.stl')
			expect(lstatSyncMock).toHaveBeenCalledTimes(0)
		})

		it('returns false if exists but is not a file', () => {
			existsSyncMock.mockReturnValue(true)
			const statsIsFileMock = jest.fn().mockReturnValue(false)
			lstatSyncMock.mockReturnValue({ isFile: statsIsFileMock } as unknown as fs.Stats)

			expect(isFile('directory')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('directory')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('directory')
		})

		it('returns true if exists and is a file', () => {
			mockExistsAndIsFile()

			expect(isFile('file')).toBe(true)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('file')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('file')
		})
	})

	describe('isDir', () => {
		const existsSyncMock = fs.existsSync as unknown as jest.Mock<boolean, [fs.PathLike]>
		const lstatSyncMock = fs.lstatSync as unknown as jest.Mock<fs.Stats, [fs.PathLike]>

		it('returns false if does not exist', () => {
			existsSyncMock.mockReturnValue(false)

			expect(isDir('non-existent')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('non-existent')
			expect(lstatSyncMock).toHaveBeenCalledTimes(0)
		})

		it('returns false if exists but is not a directory', () => {
			existsSyncMock.mockReturnValue(true)
			const statsIsDirectoryMock = jest.fn().mockReturnValue(false)
			lstatSyncMock.mockReturnValue({ isDirectory: statsIsDirectoryMock } as unknown as fs.Stats)

			expect(isDir('file')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('file')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('file')
		})

		it('returns true if exists and is a directory', () => {
			mockExistsAndIsDirectory()

			expect(isDir('directory')).toBe(true)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('directory')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('directory')
		})
	})

	describe('findYAMLFilename', () => {
		it('returns filename with yaml extension if that is found', () => {
			mockExistsAndIsFile()

			expect(findYAMLFilename('filename')).toBe('filename.yaml')
		})

		it('returns filename with yml extension if that is found', () => {
			existsSyncMock.mockReturnValueOnce(false)
			mockExistsAndIsFile()

			expect(findYAMLFilename('filename')).toBe('filename.yml')
		})

		it('returns false when no matching file found', () => {
			existsSyncMock.mockReturnValue(false)

			expect(findYAMLFilename('filename')).toBe(false)
		})
	})

	describe('requireFile', () => {
		it('returns filename when it exists and is a file', () => {
			mockExistsAndIsFile()

			expect(requireFile('my-file')).toBe('my-file')
		})

		it('throws exception when file does not exist', () => {
			existsSyncMock.mockReturnValue(false)
			expect(() => requireFile('not-a-file')).toThrow()
		})
	})

	describe('requireDir', () => {
		it('returns directory when it exists and is a directory', () => {
			mockExistsAndIsDirectory()

			expect(requireDir('my-dir')).toBe('my-dir')
		})

		it('throws exception when directory does not exist', () => {
			existsSyncMock.mockReturnValue(false)
			expect(() => requireDir('not-a-dir')).toThrow()
		})
	})

	describe('readYAMLFile', () => {
		const readFileSyncMock = fs.readFileSync as unknown as jest.Mock<string, [fs.PathLike]>
		// eslint-disable-next-line @typescript-eslint/ban-types
		const safeLoadMock = yaml.safeLoad as jest.Mock<object | string, [string]>

		it('returns processed file', () => {
			readFileSyncMock.mockReturnValueOnce(('file contents'))
			safeLoadMock.mockReturnValueOnce('parsed yaml file')

			expect(readYAMLFile('filename')).toBe('parsed yaml file')

			expect(readFileSyncMock).toHaveBeenCalledTimes(1)
			expect(readFileSyncMock).toHaveBeenCalledWith('filename', 'utf-8')
			expect(safeLoadMock).toHaveBeenCalledTimes(1)
			expect(safeLoadMock).toHaveBeenCalledWith('file contents')
		})

		it('has default error message', () => {
			readFileSyncMock.mockImplementation(() => { throw Error('read failure') })

			expect(() => readYAMLFile('filename'))
				.toThrow(new CLIError('error "Error: read failure" reading filename'))

			expect(readFileSyncMock).toHaveBeenCalledTimes(1)
			expect(readFileSyncMock).toHaveBeenCalledWith('filename', 'utf-8')
		})

		it('uses specified error message', () => {
			readFileSyncMock.mockReturnValueOnce(('file contents'))
			safeLoadMock.mockImplementation(() => { throw Error('badness') })

			expect(() => readYAMLFile('filename', 'error "{error}" reading config file'))
				.toThrow(new CLIError('error "Error: badness" reading config file'))

			expect(readFileSyncMock).toHaveBeenCalledTimes(1)
			expect(readFileSyncMock).toHaveBeenCalledWith('filename', 'utf-8')
			expect(safeLoadMock).toHaveBeenCalledTimes(1)
			expect(safeLoadMock).toHaveBeenCalledWith('file contents')
		})
	})
})
