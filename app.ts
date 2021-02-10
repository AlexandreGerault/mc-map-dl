import { serve } from "https://deno.land/std@0.86.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.86.0/http/file_server.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { JSZip, zipDir } from "https://deno.land/x/jszip/mod.ts";
import { exists } from "https://deno.land/std@0.86.0/fs/mod.ts";
import { v4 } from "https://deno.land/std@0.86.0/uuid/mod.ts";

import "https://deno.land/x/dotenv/load.ts";

const { MINECRAFT_SERVER_PATH: srcFolder, PORT } = config();

const server = serve({ hostname: "127.0.0.1", port: parseInt(PORT, 10) });
console.log(
  `HTTP webserver running.  Access it at:  http://localhost:${PORT}/`,
);

const zipper = () => {
  const zip = new JSZip();

  const add = async (entry: Deno.DirEntry, path?: string) => {
    const genPath = (prefix: string, subject: Deno.DirEntry) => {
      return `${prefix}${subject.name}`;
    };

    zip.folder(path + "/");
    if (entry.isFile) {
      const p = genPath(path + "/", entry);
      console.log(`~add():${p}`);
      zip.addFile(
        entry.name,
        await Deno.readFile(p),
      );
    } else if (entry.isDirectory) {
      const p = genPath(path + "/", entry);
      console.log(`~add():${p}`);
      for await (
        const innerEntry of Deno.readDir(
          p,
        )
      ) {
        const q = genPath(path + "/", entry);
        console.log(`~add():${q}`);
        await add(innerEntry, q);
      }
    }
  };

  const folder = async (path: string) => {
    for await (const dirEntry of Deno.readDir(srcFolder)) {
      console.log(`~folder():${srcFolder}/${dirEntry.name}`);
      await add(dirEntry, path);
    }
  };

  const getZip = () => {
    return zip;
  };

  return { getZip, folder };
};

for await (const request of server) {
  switch (request.url) {
    case "/download":
      if (await exists(srcFolder)) {
        const encoder = new TextEncoder();
        const zipArchive = await zipDir(srcFolder);
        for (const key of Object.keys(zipArchive.files())) {
          if (key.match("world") === null) {
            zipArchive.remove(key);
          }
        }

        const savePath = `public/saves/${v4.generate()}.zip`;
        await zipArchive.writeZip(savePath);
        request.respond({
          status: 200,
          body: savePath.substr("public".length, savePath.length),
        });
      } else {
        request.respond({
          status: 404,
          body: "The server map doesn't seem to exist...",
        });
      }

    case "/": {
      const body = await Deno.readTextFile(`${Deno.cwd()}/public/index.html`);
      /* const body = read html file content */
      request.respond({ status: 200, body });
      break;
    }

    default: {
      const path = `${Deno.cwd()}/public${request.url}`;
      if (await exists(path)) {
        console.log(`Serving ${path}`);
        const content = await serveFile(request, path);
        request.respond(content);
      } else {
        request.respond({ status: 404, body: "File not found" });
      }
      break;
    }
  }
}
