angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/ckeditor/ckeditor.html","<div class=\"form-group {{form.htmlClass}}\"\r\n     ng-class=\"{\'has-error\': form.disableErrorState !== true && hasError(), \'has-success\': form.disableSuccessState !== true && hasSuccess(), \'has-feedback\': form.feedback !== false}\">\r\n  <label class=\"control-label {{form.labelHtmlClass}}\"\r\n         ng-show=\"showTitle()\">\r\n    {{form.title}}\r\n  </label>\r\n\r\n  <div class=\"{{ form.fieldWrapperHtmlClass }}\">\r\n    <textarea ng-show=\"form.key\"\r\n              style=\"background-color: white\"\r\n              type=\"text\"\r\n              class=\"form-control\"\r\n              schema-validate=\"form\"\r\n              ng-model=\"$$value$$\"\r\n              ckeditor=\"form.ckeditor\"></textarea>\r\n    <span ng-if=\"form.feedback !== false\"\r\n          class=\"form-control-feedback\"\r\n          ng-class=\"evalInScope(form.feedback) || {\'glyphicon\': true, \'glyphicon-ok\': hasSuccess(), \'glyphicon-remove\': hasError() }\"\r\n          aria-hidden=\"true\"> </span>\r\n    <span ng-if=\"hasError() || hasSuccess()\"\r\n      id=\"{{form.key.slice(-1)[0] + \'Status\'}}\"\r\n      class=\"sr-only\">{{ hasSuccess() ? \'(success)\' : \'(error)\' }}</span>\r\n    <div class=\"help-block\" sf-message=\"form.description\"> </div>\r\n  </div>\r\n</div>\r\n");}]);
angular.module('schemaForm')
.config(['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
  function(schemaFormProvider,  schemaFormDecoratorsProvider, sfPathProvider) {

    var ckeditor = function(name, schema, options) {
      if (schema.type === 'string' && schema.format === 'ckeditor') {
        var f = schemaFormProvider.stdFormObj(name, schema, options);
        f.key  = options.path;
        f.type = 'ckeditor';
        options.lookup[sfPathProvider.stringify(options.path)] = f;
        return f;
      }
    };

    schemaFormProvider.defaults.string.unshift(ckeditor);

    //Add to the bootstrap directive
    schemaFormDecoratorsProvider.addMapping(
      'bootstrapDecorator',
      'ckeditor',
      'directives/decorators/bootstrap/ckeditor/ckeditor.html'
    );
    schemaFormDecoratorsProvider.createDirective(
      'ckeditor',
      'directives/decorators/bootstrap/ckeditor/ckeditor.html'
    );
  }
]);
(function(angular, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['angular', 'ckeditor'], function(angular) {
			return factory(angular);
		});
	} else {
		return factory(angular);
	}
}(angular || null, function(angular) {
	var app = angular.module('schemaForm');
	var $defer, loaded = false;

	app.run(['$q', '$timeout', function($q, $timeout) {
		$defer = $q.defer();

		if (angular.isUndefined(CKEDITOR)) {
			throw new Error('CKEDITOR not found');
		}
		CKEDITOR.disableAutoInline = true;

		function checkLoaded() {
			if (CKEDITOR.status == 'loaded') {
				loaded = true;
				$defer.resolve();
			} else {
				checkLoaded();
			}
		}
		CKEDITOR.on('loaded', checkLoaded);
		$timeout(checkLoaded, 100);
	}])

	app.directive('ckeditor', ['$timeout', '$q', function($timeout, $q) {
		'use strict';

		return {
			restrict: 'AC',
			require: ['ngModel', '^?form'],
			scope: false,
			link: function(scope, element, attrs, ctrls) {
				var ngModel = ctrls[0];
				var form = ctrls[1] || null;
				var EMPTY_HTML = '<p></p>',
					isTextarea = element[0].tagName.toLowerCase() == 'textarea',
					data = [],
					isReady = false;

				if (!isTextarea) {
					element.attr('contenteditable', true);
				}

				var onLoad = function() {
					var options = {
						toolbar: 'full',
						disableNativeSpellChecker: false,
						uiColor: '#FAFAFA',
						height: '400px',
						width: '100%'
					};
					if (attrs.ckeditor) {
						var customOptions = scope.$eval(attrs.ckeditor);
						options = angular.extend(options, customOptions);
					}

					var instance = (isTextarea) ? CKEDITOR.replace(element[0], options) : CKEDITOR.inline(element[0], options),
						configLoaderDef = $q.defer();

					element.bind('$destroy', function() {
						instance.destroy(
							false //If the instance is replacing a DOM element, this parameter indicates whether or not to update the element with the instance contents.
						);
					});
					var setModelData = function(setPristine) {
							var data = instance.getData();
							if (data == '') {
								data = null;
							}
							$timeout(function() { // for key up event
								(setPristine !== true || data != ngModel.$viewValue) && ngModel.$setViewValue(data);
								(setPristine === true && form) && form.$setPristine();
							}, 0);
						},
						onUpdateModelData = function(setPristine) {
							if (!data.length) {
								return;
							}


							var item = data.pop() || EMPTY_HTML;
							isReady = false;
							instance.setData(item, function() {
								setModelData(setPristine);
								isReady = true;
							});
						}

					//instance.on('pasteState',   setModelData);
					instance.on('change', setModelData);
					instance.on('blur', setModelData);
					//instance.on('key',          setModelData); // for source view

					instance.on('instanceReady', function() {
						scope.$broadcast("ckeditor.ready");
						scope.$apply(function() {
							onUpdateModelData(true);
						});

						instance.document.on("keyup", setModelData);
					});
					instance.on('customConfigLoaded', function() {
						configLoaderDef.resolve();
					});

					ngModel.$render = function() {
						data.push(ngModel.$viewValue);
						if (isReady) {
							onUpdateModelData();
						}
					};
				};

				if (CKEDITOR.status == 'loaded') {
					loaded = true;
				}
				if (loaded) {
					onLoad();
				} else {
					$defer.promise.then(onLoad);
				}
			}
		};
	}]);

	return app;
})
);