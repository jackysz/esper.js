'use strict';
var expect = require('chai').expect;
var Engine = require('../src/index.js').Engine;
var esper = require('../src/index.js');

function a(code, o) {
	var e = new Engine({
		foreignObjectMode: 'smart',
		addExtraErrorInfoToStacks: true
	});

	e.evalSync('function a(arg) {\n' + code + '}');
	var fx = e.fetchFunctionSync('a');
	var args = Array.prototype.slice.call(arguments, 1);
	return fx.apply(null, args);
}

function b(code) {
	var e = new Engine({
		foreignObjectMode: 'smart'
	});

	class User {
		constructor() {
			this.name = 'Annoner';
			this.secret = 'sauce';
		}
		ident() { return this.name + ' (' + (this.age || '?') + ')'; }
		identity(o) { return o; }
		bad() { return 'oh no!'; }
		toString() { return this.name; }
	}
	User.prototype.type = 'User';
	User.prototype.code = 1234;

	User.prototype.apiProperties = ['name', 'age', 'type'];
	User.prototype.apiMethods = ['ident', 'identity'];


	e.evalSync('var a = ' + code.toString());
	var fx = e.fetchFunctionSync('a');
	return fx.call(null, new User());
}

describe('Smart Link', () => {
	describe('Test Harness', () => {

		it('should run code with return values', () => {
			expect(a('return 2+2')).to.equal(4);
		});

		it('should be using smart objects', () => {
			expect(a('return Esper.str(arg)', {})).to.match(/^\[SmartLink/);
		});
	});

	describe('Passing Arguments to fetchFunctionSync', () => {

		it('should pass nothing as type undefined', () => {
			expect(a('return typeof arg')).to.equal('undefined');
		});

		it('should pass nothing as undefined', () => {
			expect(a('return arg')).to.equal(undefined);
		});

		it('should pass undefined as undefined', () => {
			expect(a('return typeof arg', void 0)).to.equal('undefined');
		});

		it('should pass null as typeof object', () => {
			expect(a('return typeof arg', null)).to.equal('object');
		});

		it('should pass null as null', () => {
			expect(a('return arg', null)).to.equal(null);
		});

		it('should pass numbers typeof number', () => {
			expect(a('return typeof arg', 7)).to.equal('number');
		});

		it('should pass numbers as numbers', () => {
			expect(a('return arg', 7)).to.equal(7);
		});

		it('should pass objects as objects', () => {
			expect(a('return typeof arg', {})).to.equal('object');
		});

		it('should pass functions as function', () => {
			expect(a('return typeof arg', function() {} )).to.equal('function');
		});

	});

	describe('Maps well known values', () => {
		it('should map Object', () => {
			expect(a('return arg === Object', Object)).to.be.true;
		});

		it('should use Object Prototype', () => {
			expect(a('return Object.getPrototypeOf(arg) === Object.prototype', {rob: 1})).to.be.true;
			expect(a('return arg.toString === Object.prototype.toString', {rob: 1})).to.be.true;
		});

		it('should use Function Prototype', () => {
			//expect(a('return Object.getPrototypeOf(arg) === Function.prototype', function() {} )).to.be.true;
			expect(a('return arg.call === Function.prototype.call', function() {} )).to.be.true;
		});

		it('should use Array Prototype', () => {
			expect(a('return Object.getPrototypeOf(arg) === Array.prototype', [1,2,3] )).to.be.true;
			expect(a('return arg.join === Array.prototype.join', [1,2,3] )).to.be.true;
		});


	});

	describe('Reading properties', () => {
		var obj =  {x: {y: 20}};
		it('should do subobjects', () => {
			expect(a('return arg.x.y', obj)).to.equal(20);
		});

		it('should do subobjects as object type', () => {
			expect(a('return typeof arg.x', obj)).to.equal('object');
		});

		it('subobjects should be SmartLinks', () => {
			expect(a('return Esper.str(arg.x)', obj)).to.match(/^\[SmartLink/);
		});

		it('should send the correct this value', () => {
			var o1 = {x: 1, getX: function() { return this.x; }};
			var o2 = Object.create(o1);
			o2.x = 2;
			expect(a('return arg.getX()', o2)).to.equal(2);
		});

		it('should send the correct this value with getter', () => {
			var o1 = {x: 1};
			Object.defineProperty(o1, 'getX', {
				get: function() { return this.x; }
			});
			var o2 = Object.create(o1);
			o2.x = 2;
			expect(a('return arg.getX', o2)).to.equal(2);
		});

		it('should send the correct this value with setter', () => {
			var o1 = {x: 1};
			Object.defineProperty(o1, 'esper_getX', {
				configurable: true,
				enumerable: true,
				get: function() { return 6; },
				set: function() { return this.y = this.x; }
			});
			var o2 = Object.create(o1);
			o2.x = 2;
			o2.apiUserProperties = ['getX'];
			expect(a('return arg.getX = 7;', o2)).to.equal(7);
			expect(o2.y).to.equal(2);
		});

	});

	describe('Writing properties', () => {
		var obj =  {x: 10};
		it('shouldnt allow writes by default', () => {
			expect(() => a('arg.x = 1', obj)).to.throw('Can\'t write to protected property: x');
		});

	});

	it('Privlaged Threads', () => {
		var e = new Engine({
			foreignObjectMode: 'smart',
			addExtraErrorInfoToStacks: true
		});
		e.realm.globalScope.add('x', esper.Value.undef);
		let run = function(code) {
			e.evalSync('function a(arg) {\n' + code + '}');
			var fx = e.fetchFunctionSync('a');
			var args = Array.prototype.slice.call(arguments, 1);
			return fx.apply(null, args);
		};

		class User {
			constructor() {
				this.name = 'Annoner';
				this.secret = 'sauce';
			}
		}

		User.prototype.apiProperties = ['name'];
		var u = new User();
		run('x = arg', u);
		//expect(run('return Esper.str(x)')).to.equal("[SmartLink: Annoner, props: name,age,type,ident,identity]");
		expect(() => run('x.secret')).to.throw();
		esper.SmartLinkValue.makeThreadPrivlaged(e.evaluator);
		expect(run('return x.secret')).to.equal('sauce');

	});


	describe('Respect API properties', () => {
		it('read allowed property', () => {
			expect(b(function(o) { return o.name; })).to.equal('Annoner');
			expect(b(function(o) { return o.age; })).to.be.undefined;
			expect(b(function(o) { return o.type; })).to.equal('User');
			expect(b(function(o) { return o.ident(); })).to.equal('Annoner (?)');
			expect(b(function(o) { return o.somethingThatDoesntExist; })).to.be.undefined;
		});

		it('methods', () => {
			expect(b(function(o) { return o.identity(7); })).to.equal(7);
			expect(b(function(o) { return o.identity.call(null, 7); })).to.equal(7);
		});

		it('can\'t read unregistered property', () => {
			expect(() => b(function(o) { return o.secret; })).to.throw();
			expect(() => b(function(o) { return o.bad(); })).to.throw();
			expect(() => b(function(o) { return o.code; })).to.throw();
		});

		it('can\'t overwrite properties', () => {
			expect(() => b(function(o) { return o.name = 'Rob'; })).to.throw();
			expect(() => b(function(o) { return o.secret = 'something'; })).to.throw();
		});


		it('supports user assinged properties', () => {
			expect(b(function(o) {
				o.nue = 5;
				o.nue += 2;
				return o.nue;
			})).to.equal(7);
		});

	});

	describe('esper_ method overrides', () => {
		it('will use an esper_ property if it exists', () => {
			expect(a('return arg.one();', {
				apiProperties: [],
				one: () => 1,
				esper_one: () => 2
			})).to.equal(2);
		});
		it('respects esper_ properties wrt getters', () => {
			var obj = {one: 5};
			Object.defineProperty(obj, 'esper_one', {
				get: function() { return this.one * 2; },
			});
			expect(a('return arg.one;', obj)).to.equal(10);
			expect(obj.one).to.equal(5);
		});
		it('respects esper_ properties wrt getters and setters', () => {
			var obj = {one: 5, apiUserProperties: ['one']};
			Object.defineProperty(obj, 'esper_one', {
				get: function() { return this.one * 2; },
				set: function(v) { this.one = v + 1; },
				enumerable: true
			});
			expect(a('return arg.one;', obj)).to.equal(10);
			expect(a('arg.one = 2; return arg.one', obj)).to.equal(6);
			expect(obj.one).to.equal(3);
		});

		it('respects esper_ properties wrt getters and setters w/ Privlaged Threads', () => {
			var obj = {one: 5, apiUserProperties: ['x']};
			Object.defineProperty(obj, 'esper_one', {
				get: function() { return this.one * 2; },
				set: function(v) { this.one = v + 1; },
				enumerable: true
			});

			var e = new Engine({
				foreignObjectMode: 'smart',
				addExtraErrorInfoToStacks: true,
				addInternalStack: true
			});
			e.realm.globalScope.add('x', esper.Value.undef);
			let run = function(code) {
				e.evalSync('function a(arg) {\n' + code + '}');
				var fx = e.fetchFunctionSync('a');
				var args = Array.prototype.slice.call(arguments, 1);
				try {
					var out = fx.apply(null, args);
				} catch ( e ) {
					console.log('EE', e.stack);
					throw e;
				}

				return out;
			};
			esper.SmartLinkValue.makeThreadPrivlaged(e.evaluator);
			expect(run('return arg.one;', obj)).to.equal(10);
			expect(run('arg.one = 2; return arg.one', obj)).to.equal(6);
			expect(obj.one).to.equal(3);
		});

	});

	describe('Remote Invocation', () => {
		it('should invoke String function not as a constructor', () => {
			expect(a('return typeof arg(7)', String)).to.equal('string');
		});

		it('should invoke String constructor as a constructor', () => {
			expect(a('return typeof new arg(7)', String)).to.equal('object');
		});

		it('should invoke Date function not as a constructor', () => {
			expect(a('return typeof arg(7)', Date)).to.equal('string');
		});

		it('should invoke Date constructor as a constructor', () => {
			expect(a('return typeof new arg(7)', Date)).to.equal('object');
		});

		it('should pass the issue #9 test code', () => {
			expect(a("return new arg('December 25, 1995 23:15:30').getMonth();", Date)).to.equal(11);
		});

	});

});
