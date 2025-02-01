/* script.js */

// Increase the base width so nodes are spread apart.
const margin = { top: 60, right: 90, bottom: 30, left: 90 },
  baseWidth = 2000, // increased base width to spread nodes out
  height = 900 - margin.top - margin.bottom,
  width = baseWidth - margin.left - margin.right;

let i = 0,
  duration = 750,
  root;

const svg = d3.select("#tree-container")
  .append("svg")
  .attr("width", baseWidth + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Create the tree layout with a separation function.
const treemap = d3.tree()
  .size([height, width])
  .separation((a, b) => a.parent === b.parent ? 1 : 1.5);

// Helper function to compute the pill's width based on the node's content.
function computePillWidth(d) {
  const fullName = d.data.firstName + " " + d.data.lastName;
  const charWidth = 8;      // approximate width per character
  const nameWidth = fullName.length * charWidth;
  const markerWidth = 20;   // fixed marker width
  const padding = 20;       // total horizontal padding (10px each side)
  return markerWidth + nameWidth + padding;
}

// Load tree data from external JSON file.
d3.json("data.json").then(function(treeData) {
  // Create the root hierarchy node from the data.
  root = d3.hierarchy(treeData, d => d.children);
  root.x0 = height / 2;
  root.y0 = 0;

  // *** Remove or comment out the collapse step so that all nodes are expanded ***
  // if (root.children) {
  //   root.children.forEach(collapse);
  // }

  update(root);
}).catch(function(error) {
  console.error("Error loading data:", error);
});

// Collapse function: hides children by moving them to _children.
function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

// Update function to re-render the tree.
function update(source) {
  const treeData = treemap(root);
  const nodes = treeData.descendants(),
    links = treeData.descendants().slice(1);

  // Normalize for fixed depth.
  nodes.forEach(d => d.y = d.depth * 180);

  /********** Nodes Section **********/
  const node = svg.selectAll("g.node")
    .data(nodes, d => d.id || (d.id = ++i));

  // Enter new nodes at the parent's previous position.
  const nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", d => "translate(" + source.y0 + "," + source.x0 + ")")
    .on("click", click);

  // Append a pill-shaped rectangle.
  nodeEnter.append("rect")
    .attr("x", d => -computePillWidth(d) / 2)
    .attr("y", -15)
    .attr("width", d => computePillWidth(d))
    .attr("height", 30)
    .attr("rx", 15) // rounded corners for pill shape
    .attr("ry", 15)
    .style("fill", d => d.data.color === "green" ? "green" : "gray")
    .style("stroke", "steelblue")
    .style("stroke-width", "2px");

  // Append a foreignObject containing HTML for marker and name.
  nodeEnter.append("foreignObject")
    .attr("class", "node-fo")
    .attr("x", d => -computePillWidth(d) / 2)
    .attr("y", -15)
    .attr("width", d => computePillWidth(d))
    .attr("height", 30)
    .html(d => {
      const markerText = d._children ? "+" : (d.children ? "-" : "");
      const fullName = d.data.firstName + " " + d.data.lastName;
      return `<div class="container">
                  <span class="marker">${markerText}</span>
                  <span class="name">${fullName}</span>
                </div>`;
    });

  // Merge entering nodes with existing nodes.
  const nodeUpdate = nodeEnter.merge(node);

  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

  nodeUpdate.select("rect")
    .attr("x", d => -computePillWidth(d) / 2)
    .attr("width", d => computePillWidth(d))
    .style("fill", d => d.data.color === "green" ? "green" : "gray");

  nodeUpdate.select("foreignObject.node-fo")
    .attr("x", d => -computePillWidth(d) / 2)
    .attr("width", d => computePillWidth(d))
    .html(d => {
      const markerText = d._children ? "+" : (d.children ? "-" : "");
      const fullName = d.data.firstName + " " + d.data.lastName;
      return `<div class="container">
                  <span class="marker">${markerText}</span>
                  <span class="name">${fullName}</span>
                </div>`;
    });

  const nodeExit = node.exit().transition()
    .duration(duration)
    .attr("transform", d => "translate(" + source.y + "," + source.x + ")")
    .remove();

  nodeExit.select("rect")
    .attr("width", 1e-6)
    .attr("height", 1e-6);

  nodeExit.select("foreignObject")
    .style("fill-opacity", 1e-6);

  /********** Links Section **********/
  const link = svg.selectAll("path.link")
    .data(links, d => d.id);

  const linkEnter = link.enter().insert("path", "g")
    .attr("class", "link")
    .attr("d", d => {
      const o = { x: source.x0, y: source.y0 };
      return diagonal(o, o);
    });

  const linkUpdate = linkEnter.merge(link);

  linkUpdate.transition()
    .duration(duration)
    .attr("d", d => diagonal(d, d.parent));

  const linkExit = link.exit().transition()
    .duration(duration)
    .attr("d", d => {
      const o = { x: source.x, y: source.y };
      return diagonal(o, o);
    })
    .remove();

  nodes.forEach(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });

  function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
  }
}

function click(event, d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}
