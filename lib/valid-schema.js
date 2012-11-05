var common = require('./common'),
	getType = common.getType,
	prettyType = common.prettyType,
	isOfType = common.isOfType,
	getName = common.getName,
	validateObjectVsSchema = require('./valid-object');

function throwInvalidType(names, attribFullName, value, expected) {
	throw new Error('Schema' + getName(names) + ': ' + attribFullName + ' is ' + prettyType(getType(value)) + ' when it should be ' + expected);
}

function assertType(schema, attribName, expectedType, names) {
	if (schema[attribName] !== undefined) {
		if (!isOfType(schema[attribName], expectedType)) {
			throwInvalidType(names, '\'' + attribName + '\' attribute', schema[attribName], prettyType(expectedType));
		}
	}
}

function validateRequired(schema, names) {
	assertType(schema, 'required', 'boolean', names);
}

function validateDefault(schema, names) {
	if (schema.default !== undefined) {
		try {
			validateObjectVsSchema(schema.default, schema);
		} catch(err) {
			throw new Error('Schema' + getName(names) + ': \'default\' attribute value is not valid according to the schema: ' + err.message);
		}
	}
}

function validateType(schema, names) {
	if (schema.type !== undefined) {
		if (isOfType(schema.type, 'string')) {
			// simple type - nothing to validate
		} else if (isOfType(schema.type, 'array')) {
			// union type
			if (schema.type.length < 2) {
				throw new Error('Schema' + getName(names) + ': \'type\' attribute union length is ' + schema.type.length + ' when it should be at least 2');
			}
			for (var i = 0; i < schema.type.length; ++i) {
				if (isOfType(schema.type[i], 'string')) {
					// simple type (inside union type) - nothing to validate
				} else if (isOfType(schema.type[i], 'object')) {
					// schema (inside union type)
					try {
						validateSchema(schema.type[i], []);
					} catch(err) {
						throw new Error('Schema' + getName(names) + ': \'type\' attribute union element ' + i + ' is not a valid schema: ' + err.message);
					}
				} else {
					throwInvalidType(names, '\'type\' attribute union element ' + i, schema.type[i], 'either an object (schema) or a string');
				}
			}
		} else {
			throwInvalidType(names, '\'type\' attribute', schema.type, 'either a string or an array');
		}
	}
}

function validateDisallow(schema, names) {
	if (schema.disallow !== undefined) {
		if (isOfType(schema.disallow, 'string')) {
			// simple type - nothing to validate
		} else if (isOfType(schema.disallow, 'array')) {
			// union type
			if (schema.disallow.length < 2) {
				throw new Error('Schema' + getName(names) + ' \'disallow\' attribute union length is ' + schema.disallow.length + ' when it should be at least 2');
			}
			for (var i = 0; i < schema.disallow.length; ++i) {
				if (isOfType(schema.disallow[i], 'string')) {
					// simple type (inside union type) - nothing to validate
				} else if (isOfType(schema.disallow[i], 'object')) {
					// schema (inside union type)
					try {
						validateSchema(schema.disallow[i], []);
					} catch(err) {
						throw new Error('Schema' + getName(names) + ': \'disallow\' attribute union element ' + i + ' is not a valid schema: ' + err.message);
					}
				} else {
					throwInvalidType(names, '\'disallow\' attribute union element ' + i, schema.disallow[i], 'either an object (schema) or a string');
				}
			}
		} else {
			throwInvalidType(names, '\'disallow\' attribute', schema.disallow, 'either a string or an array');
		}
	}
}

function validateEnum(schema, names) {
	assertType(schema, 'enum', 'array', names);
}

function validateArray(schema, names) {
	assertType(schema, 'minItems', 'integer', names);
	assertType(schema, 'maxItems', 'integer', names);

	if (schema.items !== undefined) {
		var i;
		if (isOfType(schema.items, 'object')) {
			// all the items in the array MUST be valid according to the schema
			try {
				validateSchema(schema.items, []);
			} catch(err) {
				throw new Error('Schema' + getName(names) + ' \'items\' attribute is not a valid schema: ' + err.message);
			}
		} else if (isOfType(schema.items, 'array')) {
			// each position in the instance array MUST conform to the schema in the corresponding position for this array
			for (i = 0; i < schema.items.length; ++i) {
				try {
					validateSchema(schema.items[i], []);
				} catch(err) {
					throw new Error('Schema' + getName(names) + ' \'items\' attribute element ' + i + ' is not a valid schema: ' + err.message);
				}
			}
		} else {
			throwInvalidType(names, '\'items\' attribute', schema.items, 'either an object (schema) or an array');
		}
	}

	if (schema.additionalItems !== undefined) {
		if (schema.additionalItems === false) {
			// ok
		} else if (!isOfType(schema.additionalItems, 'object')) {
			throwInvalidType(names, '\'additionalItems\' attribute', schema.additionalItems, 'either an object (schema) or false');
		} else {
			try {
				validateSchema(schema.additionalItems, []);
			} catch(err) {
				throw new Error('Schema' + getName(names) + ' \'additionalItems\' attribute is not a valid schema: ' + err.message);
			}
		}
	}

	assertType(schema, 'uniqueItems', 'boolean', names);
}

function validateObject(schema, names) {
	assertType(schema, 'properties', 'object', names);
	if (schema.properties !== undefined) {
		for (var property in schema.properties) {
			validateSchema(schema.properties[property], names.concat([property]));
		}
	}

	assertType(schema, 'patternProperties', 'object', names);
	if (schema.patternProperties !== undefined) {
		for (var reStr in schema.patternProperties) {
			validateSchema(schema.patternProperties[reStr], names.concat([reStr]));
		}
	}

	if (schema.additionalProperties !== undefined) {
		if (schema.additionalProperties === false) {
			// ok
		} else if (!isOfType(schema.additionalProperties, 'object')) {
			throwInvalidType(names, '\'additionalProperties\' attribute', schema.additionalProperties, 'either an object (schema) or false');
		} else {
			try {
				validateSchema(schema.additionalProperties, []);
			} catch(err) {
				throw new Error('Schema' + getName(names) + ' \'additionalProperties\' attribute is not a valid schema: ' + err.message);
			}
		}
	}

	// TODO: dependencies
}

function validateNumber(schema, names) {
	assertType(schema, 'minimum', 'number', names);
	assertType(schema, 'exclusiveMinimum', 'boolean', names);
	assertType(schema, 'maximum', 'number', names);
	assertType(schema, 'exclusiveMaximum', 'boolean', names);
	assertType(schema, 'divisibleBy', 'number', names);
	if (schema.divisibleBy !== undefined) {
		if (schema.divisibleBy === 0) {
			throw new Error('Schema' + getName(names) + ' \'divisibleBy\' attribute must not be 0');
		}
	}
};

function validateString(schema, names) {
	assertType(schema, 'minLength', 'integer', names);
	assertType(schema, 'maxLength', 'integer', names);
	assertType(schema, 'pattern', 'string', names);
}

function validateItem(schema, names) {
	validateNumber(schema, names);
	validateString(schema, names);

	// TODO: format
}

function validateSchema(schema, names) {
	if (!isOfType(schema, 'object')) {
		throw new Error('Schema' + getName(names) + ' is ' + prettyType(getType(schema)) + ' when it should be an object');
	}
	validateRequired(schema, names);
	validateType(schema, names);
	validateDisallow(schema, names);
	validateEnum(schema, names);
	validateObject(schema, names);
	validateArray(schema, names);
	validateItem(schema, names);
	// defaults are applied last after schema is validated
	validateDefault(schema, names)
}

module.exports = function(schema) {
	if (schema === undefined) {
		throw new Error('Schema is undefined');
	}

	// validate schema parameters for object root
	if (!isOfType(schema, 'object')) {
		throw new Error('Schema is ' + prettyType(getType(schema)) + ' when it should be an object');
	}
	if (schema.type === undefined) {
		throw new Error('Schema: \'type\' is required');
	}
	assertType(schema, 'type', 'string', []);
	if (schema.type !== 'object' && schema.type !== 'array') {
		throw new Error('Schema: \'type\' is \'' + schema.type + '\' when it should be either \'object\' or \'array\'');
	}

	validateSchema(schema, []);
};