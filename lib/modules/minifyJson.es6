const rNodeAttrsTypeJson = /(\/|\+)json/;

const once = true;

function oncontent() {
    return (content, node) => {
        if (node.attrs && node.attrs.type && rNodeAttrsTypeJson.test(node.attrs.type)) {
            try {
                content = JSON.stringify(JSON.parse((content || []).join('')));
            } catch (error) {
                // Invalid JSON
            }
        }

        return content;
    };
}

/* Minify JSON inside <script> tags */
export {
    once,
    oncontent
};
