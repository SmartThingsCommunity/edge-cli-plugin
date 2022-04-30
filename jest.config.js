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
	setupFilesAfterEnv: [
		'@smartthings/cli-testlib',
	],
	collectCoverageFrom: ['src/**/*.ts'],
}
