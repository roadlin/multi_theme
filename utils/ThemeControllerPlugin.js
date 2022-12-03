const { ConcatSource } = require('webpack-sources');

function getThemeCss(templates) {
  const themeMap = {};
  for (const key in templates) {
    if (Object.hasOwnProperty.call(templates, key)) {
      const variables = templates[key];
      themeMap[key] = `:root:root {\n${Object.entries(variables).map(([key, value]) => `--${key}: ${value};`).join('\n')}\n}`;
    }
  }
  return themeMap;
}

module.exports = class ThemeControllerPlugin {
  constructor(config) {
    if (!config) {
      throw new TypeError('Invaild Theme Definitions');
    }

    this.options = config;
  }

  createScript(file) {
    if (!/main(\..*)?\.js/.test(file) && !/bundle\.js/.test(file)) {
      return;
    }
    const themesConfig = this.options;
    return `
      (function() {
        if (window) {
          window.ThemeController = {
            _themes: ${JSON.stringify(getThemeCss(themesConfig.templates))},
            get(key) {
              return decodeURIComponent(this._themes[key]);
            },
            set(key) {
              let styleEle = document.getElementById('theme-variables');
              if (!styleEle) {
                styleEle = document.createElement('style');
                styleEle.id = 'theme-variables';
                styleEle.innerHTML = '';
                document.head.append(styleEle);
                const css = this.get(key);
                // 单词插入不能超过 1w 字符，所以需要分多个 textNode 节点插入
                const styleRows = css.split('\\n');
                let text = '';
                const limitLength = 10000;
                for (let i = 0; i < styleRows.length; i++) {
                  text += styleRows[i];
                  if (text.length < limitLength - 100 && i < (styleRows.length - 1)) {
                    continue;
                  }
                  const textNode = document.createTextNode(text + '\\n');
                  styleEle.append(textNode);
                  text = '';
                }
              } else {
                styleEle.innerHTML = this.get(key);
              }
            }
          };
        }
      })();
      ${themesConfig.defaultTheme ? `(function () {
        window.lib.amThemeController.set('${themesConfig.defaultTheme}');
      })();` : ''}
    `;
  }

  // webpack 初始化参数后会调用这个引用函数，传入初始化的 complier对象。
  apply(compiler) {
    compiler.hooks.compilation.tap(
      'ThemeControllerPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunkAssets.tapAsync('ThemeControllerPlugin', (chunks, callback) => {
          chunks.forEach((chunk) => {
            chunk.files.forEach((file) => {
              // 插入动态添加主题变量的自执行函数
              const evalStr = this.createScript(file);
              if (evalStr) {
                compilation.assets[file] = new ConcatSource(
                  evalStr,
                  '\n',
                  compilation.assets[file],
                );
              }
            });
          });

          callback();
        });
      },
    );
  }
}