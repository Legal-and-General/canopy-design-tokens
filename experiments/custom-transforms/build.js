const StyleDictionary = require('style-dictionary');

console.log('Build started...');
console.log('\n==============================================');

/*
 * Register custom transform to handle tokens that have a group
 * attribute of "color". E.g.
 * 
 */
StyleDictionary.registerTransform({
  name: 'color-group/css',
  type: 'value',
  matcher: function(prop) {
      return prop.group === 'color';
  },
  transformer: function(prop) {
      return StyleDictionary.transform['color/css'].transformer(prop);
  }
});

/*
 * Register custom transform to handle tokens that have a group
 * attribute of "size". E.g.
 * 
 */
StyleDictionary.registerTransform({
  name: 'size-group/rem',
  type: 'value',
  matcher: function(prop) {
      return prop.group === 'size';
  },
  transformer: function(prop) {
      return StyleDictionary.transform['size/rem'].transformer(prop);
  }
});

/*
 * Register a custom transform group for generating CSS tokens
 */
StyleDictionary.registerTransformGroup({
  name: 'custom/css',
  transforms: [
    'attribute/cti',
    'name/cti/kebab',
    'time/seconds',
    'content/icon',
    'size/rem',
    'color-group/css',
    'color/css',
    'size-group/rem'
  ],
});

// APPLY THE CONFIGURATION
// IMPORTANT: the registration of custom transforms
// needs to be done _before_ applying the configuration
StyleDictionaryExtended = StyleDictionary.extend(__dirname + '/config.json');


// FINALLY, BUILD ALL THE PLATFORMS
StyleDictionaryExtended.buildAllPlatforms();


console.log('\n==============================================');
console.log('\nBuild completed!');