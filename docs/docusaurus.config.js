const { themes: prismThemes } = require('prism-react-renderer');
const { version } = require('../package.json');
const lightCodeTheme = prismThemes.github;
const darkCodeTheme = prismThemes.dracula;

/** @type {import('@docusaurus/types').Config} */
module.exports = {
    title: 'htmlnano',
    tagline: 'Modular HTML minifier',
    url: 'https://htmlnano.netlify.app',
    favicon: 'logo.png',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    markdown: {
        hooks: {
            onBrokenMarkdownLinks: 'warn'
        }
    },
    organizationName: 'posthtml',
    projectName: 'htmlnano',
    trailingSlash: false,
    plugins: ['docusaurus-plugin-goatcounter'],
    themeConfig: {
        image: 'logo.png',
        navbar: {
            title: 'htmlnano',
            logo: {
                alt: 'htmlnano logo',
                src: 'logo.png'
            },
            items: [
                {
                    type: 'docsVersionDropdown',
                    position: 'right',
                    dropdownActiveClassDisabled: true
                },
                {
                    href: 'https://github.com/maltsev/htmlnano',
                    label: 'GitHub',
                    position: 'right'
                }
            ]
        },
        prism: {
            theme: lightCodeTheme,
            darkTheme: darkCodeTheme
        },
        goatcounter: {
            code: 'htmlnano'
        }
    },
    presets: [
        [
            '@docusaurus/preset-classic',
            {
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    routeBasePath: '/',
                    editUrl: 'https://github.com/maltsev/htmlnano/edit/master/docs/',
                    editCurrentVersion: true,
                    versions: {
                        stable: {
                            label: version
                        }
                    }
                }
            }
        ]
    ]
};

const algoliaConfig = {
    appId: process.env.ALGOLIA_APP_ID,
    apiKey: process.env.ALGOLIA_API_KEY,
    indexName: 'htmlnano',
    contextualSearch: true
};

if (algoliaConfig.apiKey) {
    module.exports.themeConfig.algolia = algoliaConfig;
}
