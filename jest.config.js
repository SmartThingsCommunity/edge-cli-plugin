module.exports = {
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.json',
			// TODO: remove when https://github.com/kulshekhar/ts-jest/issues/1967 is resolved
			// related flag in tsconfig as well
			isolatedModules: true
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
