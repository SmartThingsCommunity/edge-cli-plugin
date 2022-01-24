module.exports = {
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.json',
		},
	},
	moduleFileExtensions: [
		'ts',
		'js',
	],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	setupFiles: [
		'<rootDir>/test/unit/jest.setup.ts',
	],
	collectCoverageFrom: ['src/**/*.ts'],
}
