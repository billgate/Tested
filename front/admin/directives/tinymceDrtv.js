'use strict';

var directives = require('./_directives');

// https://github.com/angular-ui/ui-tinymce/blob/master/src/tinymce.js
directives.value('uiTinymceConfig', {
  baseUrl: '/vendor/tinymce',
  content_css: '/css/tinymce.css',
  language: 'ko',
  plugins: 'autolink autosave code link media table textcolor autoresize',
  menubar: false,
  height: 400,
  resize: false,
  autoresize_min_height: 400,
  autoresize_max_height: 800,
  toolbar: 'undo redo '
    + '| styleselect '
    + '| forecolor bold italic '
    + '| alignleft aligncenter alignright alignjustify '
    + '| bullist numlist outdent indent '
    + '| link media table code',
  relative_urls: false
}).directive('uiTinymce', [
  '$rootScope', '$compile', '$timeout', '$window', '$sce', 'uiTinymceConfig',
  function ($rootScope, $compile, $timeout, $window, $sce, uiTinymceConfig) {
    var generatedIds = 0;
    var ID_ATTR = 'ui-tinymce';
    if (uiTinymceConfig.baseUrl) {
      tinymce.baseURL = uiTinymceConfig.baseUrl;
    }

    return {
      require: ['ngModel', '^?form'],
      link: function (scope, element, attrs, ctrls) {
        var setupOptions;
        var ngModel;
        var form;
        var expression;
        var options = {};
        var tinyInstance;
        var updateView;

        if (!$window.tinymce) {
          return;
        }

        ngModel = ctrls[0];
        form = ctrls[1] || null;

        updateView = function (editor) {
          var content = editor.getContent({ format: options.format }).trim();
          content = $sce.trustAsHtml(content);

          ngModel.$setViewValue(content);
          if (!$rootScope.$$phase) {
            scope.$apply();
          }
        };

        function ensureInstance() {
          if (!tinyInstance) {
            tinyInstance = tinymce.get(attrs.id);
          }
        }

        function toggleDisable(disabled) {
          if (disabled) {
            ensureInstance();

            if (tinyInstance) {
              tinyInstance.getBody().setAttribute('contenteditable', false);
            }
          } else {
            ensureInstance();

            if (tinyInstance && !tinyInstance.settings.readonly) {
              tinyInstance.getBody().setAttribute('contenteditable', true);
            }
          }
        }

        // generate an ID
        attrs.$set('id', ID_ATTR + '-' + generatedIds++);

        expression = {};

        angular.extend(expression, scope.$eval(attrs.uiTinymce));

        setupOptions = {
          // Update model when calling setContent
          // (such as from the source editor popup)
          setup: function (ed) {
            ed.on('init', function () {
              ngModel.$render();
              ngModel.$setPristine();
              ngModel.$setUntouched();
              if (form) {
                form.$setPristine();
              }
            });

            // Update model on button click
            ed.on('ExecCommand', function () {
              ed.save();
              updateView(ed);
            });

            // Update model on change
            ed.on('change NodeChange', function () {
              ed.save();
              updateView(ed);
            });

            ed.on('blur', function () {
              element[0].blur();
              ngModel.$setTouched();
              scope.$digest();
            });

            // Update model when an object has been resized (table, image)
            ed.on('ObjectResized', function () {
              ed.save();
              updateView(ed);
            });

            ed.on('remove', function () {
              element.remove();
            });

            if (expression.setup) {
              expression.setup(ed, {
                updateView: updateView
              });
            }
          },
          format: expression.format || 'html',
          selector: '#' + attrs.id
        };
        // extend options with initial uiTinymceConfig and
        // options from directive attribute value
        angular.extend(options, uiTinymceConfig, expression, setupOptions);
        // Wrapped in $timeout due to $tinymce:refresh implementation, requires
        // element to be present in DOM before instantiating editor when
        // re-rendering directive
        $timeout(function () {
          if (options.baseURL) {
            tinymce.baseURL = options.baseURL;
          }
          tinymce.init(options);
          toggleDisable(scope.$eval(attrs.ngDisabled));
        });

        ngModel.$formatters.unshift(function (modelValue) {
          return modelValue ? $sce.trustAsHtml(modelValue) : '';
        });

        ngModel.$parsers.unshift(function (viewValue) {
          return viewValue ? $sce.getTrustedHtml(viewValue) : '';
        });

        ngModel.$render = function () {
          var viewValue;

          ensureInstance();

          viewValue = ngModel.$viewValue ?
            $sce.getTrustedHtml(ngModel.$viewValue) : '';

          // instance.getDoc() check is a guard against null value
          // when destruction & recreation of instances happen
          if (tinyInstance &&
            tinyInstance.getDoc()
            ) {
            tinyInstance.setContent(viewValue);
            // Triggering change event due to TinyMCE not firing event &
            // becoming out of sync for change callbacks
            tinyInstance.fire('change');
          }
        };

        attrs.$observe('disabled', toggleDisable);

        // This block is because of TinyMCE not playing well with removal and
        // recreation of instances, requiring instances to have different
        // selectors in order to render new instances properly
        scope.$on('$tinymce:refresh', function (e, id) {
          var eid = attrs.id;
          var parentElement;
          var clonedElement;

          if (angular.isUndefined(id) || id === eid) {
            parentElement = element.parent();
            clonedElement = element.clone();
            clonedElement.removeAttr('id');
            clonedElement.removeAttr('style');
            clonedElement.removeAttr('aria-hidden');
            tinymce.execCommand('mceRemoveEditor', false, eid);
            parentElement.append($compile(clonedElement)(scope));
          }
        });

        scope.$on('$destroy', function () {
          ensureInstance();

          if (tinyInstance) {
            tinyInstance.remove();
            tinyInstance = null;
          }
        });
      }
    };
  }]);
