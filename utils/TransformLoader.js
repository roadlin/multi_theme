const defaultOption = {
  type: 'less',
  root: ':root', // 默认使用 :root 可以保证可以被动态插入的变量覆盖
  variables: [],
};

module.exports = function (source) {
  // @ts-ignore
  const options = Object.assign(defaultOption, this.query);
  const { type, root, variables } = options;
  let prefix = '';
  if (type === 'less') {
    prefix = '@';
  } else if (type === 'scss') {
    prefix = '$';
  }

  // 遍历当前文件中使用到的变量
  const effectiveVars = variables.filter((v) => (new RegExp(`${prefix}${v}`, 'g')).test(source));
  // 替换样式属性值
  const result = effectiveVars.reduce((pre, v) => (
    pre.replace(new RegExp(`${prefix}${v};`, 'g'), `var(--${v});`)
  ), source);
  // 关联原始变量
  const globalVars = effectiveVars.reduce((pre, v) => (
    `${pre}--${v}: ${prefix}${v};\n`
  ), '');

  return `${root} {\n${globalVars}}\n${result}`;
}
