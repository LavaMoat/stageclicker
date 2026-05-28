import bb from "bookmarklet";
import fs from "fs";

const source = fs.readFileSync("./src/automate.js", "utf8");
const tpl = fs.readFileSync("./src/template.html", "utf8");

const built = await bb.convert(source, {});

fs.writeFileSync("./index.html", tpl.replace("__CODE__", built));
