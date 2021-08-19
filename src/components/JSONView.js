import '../scss/jsonview.scss';

let config = {
    isFolderSelectable: false,
    onClick: function () { }
};

let tree = null;

let selectedNode = null;

function expandedTemplate(params = {}) {
    const { key, size, title, id } = params;
    return `
      <div class="line">
        <div  class="caret-icon"><i class="fas fa-caret-right"></i></div>
        <div data-id="${id}"  class="json-key" title ="${title}"  >${title}</div>
        <div  btn-data-id="${id}" class="hide-btn"></div>
        <div></div>
        <!-- <span style="font-size:2px;">${id}</span> -->
      </div>
    `
}


function notExpandedTemplate(params = {}) {
    const { key, value, type, title, id } = params;
    return `
      <div class="line" data-id="${id}">
        <div class="empty-icon"></div>
        <div data-id="${id}"  class="json-key" title ="${title}" >${title}</div>
        <div class="json-separator"></div>
        <div class="json-value json-${type}"></div>
        <div part-name="${title}" class="part-perspective"></div>
        <div btn-data-id="${id}" class="hide-btn"></div>
        <div></div>
        <!-- <span style="font-size:2px;">${id}</span> -->
      </div>
    `
}

function hideNodeChildren(node) {
    node.children.forEach((child) => {
        child.el.classList.add('hide');
        if (child.isExpanded) {
            hideNodeChildren(child);
        }
    });
}


function showNodeChildren(node) {
    node.children.forEach((child) => {
        child.el.classList.remove('hide');
        if (child.isExpanded) {
            showNodeChildren(child);
        }
    });
}


function setCaretIconDown(node) {
    if (node.children.length > 0) {
        const icon = node.el.querySelector('.fas');
        if (icon) {
            icon.classList.replace('fa-caret-right', 'fa-caret-down');
        }
    }
}


function setCaretIconRight(node) {
    if (node.children.length > 0) {
        const icon = node.el.querySelector('.fas');
        if (icon) {
            icon.classList.replace('fa-caret-down', 'fa-caret-right');
        }
    }
}

function toggleNode(node) {
    if (node.isExpanded) {
        node.isExpanded = false;
        setCaretIconRight(node);
        hideNodeChildren(node);
    } else {
        node.isExpanded = true;
        setCaretIconDown(node);
        showNodeChildren(node);
    }
}


function createContainerElement() {
    const el = document.createElement('div');
    el.className = 'json-container';
    return el;
}

/**
 * Create node html element
 * @param {object} node 
 * @return html element
 */
function createNodeElement(node) {
    let el = document.createElement('div');
    const getSizeString = (node) => {
        const len = node.children.length;
        if (node.type === 'array') return `[${len}]`;
        if (node.type === 'object') return `{${len}}`;
        return null;
    }

    if (node.children.length > 0) {
        el.innerHTML = expandedTemplate({
            key: node.key,
            size: getSizeString(node),
            title: node.title,
            id: node.id,
        })

        const caretEl = el.querySelector('.caret-icon');
        caretEl.addEventListener('click', () => {
            toggleNode(node);
        });
    } else {

        el.innerHTML = notExpandedTemplate({
            key: node.key,
            value: node.value,
            type: typeof node.value,
            title: node.title,
            id: node.id
        })
    }

    const lineEl = el.children[0];

    if (node.parent !== null) {
        lineEl.classList.add('hide');
    }

    lineEl.style = 'padding-left: ' + (node.depth * 18 + 8) + 'px;';

    return lineEl;
}


/**
 * Get value data type
 * @param {*} data
 */
function getDataType(val) {
    let type = typeof val;
    if (Array.isArray(val)) type = 'array';
    if (val === null) type = 'null';
    return type;
}


/**
 * Recursively traverse json object
 * @param {object} target
 * @param {function} callback
 */
function traverseObject(target, callback) {
    callback(target);
    if (typeof target === 'object') {
        for (let key in target) {
            traverseObject(target[key], callback);
        }
    }
}


/**
 * Recursively traverse Tree object
 * @param {Object} node
 * @param {Callback} callback
 */
function traverseTree(node, callback) {
    callback(node);
    if (node.children.length > 0) {
        node.children.forEach((child) => {
            traverseTree(child, callback);
        });
    }
}


/**
 * Create node object
 * @param {object} opt options
 * @return {object}
 */
function createNode(opt = {}) {
    return {
        key: opt.key || null,
        parent: opt.parent || null,
        value: opt.hasOwnProperty('value') ? opt.value : null,
        isExpanded: opt.isExpanded || false,
        type: opt.type || null,
        children: opt.children || [],
        el: opt.el || null,
        depth: opt.depth || 0,
        title: opt.title || 'unknown',
        id: opt.id || null
    }
}


/**
 * Create subnode for node
 * @param {object} Json data
 * @param {object} node
 */
function createSubnode(data, node) {
    if (typeof data === 'object') {
        for (let key in data) {
            const child = createNode({
                value: data[key],
                key: key,
                depth: node.depth + 1,
                type: getDataType(data[key]),
                parent: node,
                title: data[key].name || data[key].uuid,
                id: data[key].uuid
            });
            node.children.push(child);
            createSubnode(data[key].children, child);
        }
    }
}


/**
 * Create tree
 * @param {object | string} jsonData 
 * @return {object}
 */
function createTree(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    const rootNode = createNode({
        value: data.children,
        key: getDataType(data),
        type: getDataType(data),
        title: data.name || data.uuid,
        id: data.uuid,
        isExpanded: true,
    });
    createSubnode(data.children, rootNode);
    return rootNode;
}


/**
 * Render JSON string into DOM container
 * @param {string | object} jsonData
 * @param {htmlElement} targetElement
 * @param {object} customConfig
 * @return {object} tree
 */
function renderJSON(jsonData, targetElement, customConfig) {
    const parsedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    tree = createTree(parsedData);
    Object.assign(config, customConfig);
    render(tree, targetElement);
    return tree;
}


/**
 * Render tree into DOM container
 * @param {object} tree
 * @param {htmlElement} targetElement
 */
function render(tree, targetElement) {
    const containerEl = createContainerElement();
    traverseTree(tree, function (node) {
        node.el = createNodeElement(node);
        const subNode = node.el.querySelector('.json-key')
        subNode.addEventListener('click', function (e) {
            let id = this.getAttribute('data-id');
            if (e.target.className.indexOf('fas') < 0 && id) {
                config.onClick(id);
            }
            if (config.isFolderSelectable || (!config.isFolderSelectable && node.children.length < 1)) {
                if (selectedNode) {
                    //selectedNode.el.className = 'line';
                    selectedNode.el.classList.remove('active')
                }
                //node.el.className = 'line active';
                node.el.classList.add('active')
                selectedNode = node;
            }
        });
        containerEl.appendChild(node.el);
    });

    targetElement.appendChild(containerEl);
}


function expandChildren(node) {
    traverseTree(node, function (child) {
        child.el.classList.remove('hide');
        child.isExpanded = true;
        setCaretIconDown(child);
    });
}

function collapseChildren(node) {
    traverseTree(node, function (child) {
        child.isExpanded = false;
        if (child.depth > node.depth) child.el.classList.add('hide');
        setCaretIconRight(child);
    });
}

function expandParent(node) {
    node.isExpanded = true;
    setCaretIconDown(node);
    showNodeChildren(node);
    if (node.parent) {
        expandParent(node.parent);
    }
}

function selectNodeById(id) {
    if (!id) {
        return;
    }

    let lineNode = document.querySelector(".line.active");
    if (lineNode) {
        lineNode.classList.remove('active')
    };

    traverseTree(tree, function (node) {
        if (node.id == id) {

            if (selectedNode) {
                selectedNode.el.className = 'line';
            }
            node.el.className = 'line active';
            selectedNode = node;
            expandParent(node);
            node.el.scrollIntoView();
        }
    });
}

function clearSelection() {
    if (selectedNode) {
        selectedNode.el.classList.remove('active');
        selectedNode = null;
    }
}


/**
 * Export public interface
 */
export {
    render,
    createTree,
    renderJSON,
    expandChildren,
    collapseChildren,
    traverseTree,
    selectNodeById,
    clearSelection
}