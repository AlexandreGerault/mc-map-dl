import { serve } from "https://deno.land/std@0.86.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.86.0/http/file_server.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { zipDir } from "https://deno.land/x/jszip/mod.ts";
import { exists } from "https://deno.land/std@0.86.0/fs/mod.ts";
import { v4 } from "https://deno.land/std@0.86.0/uuid/mod.ts";

import "https://deno.land/x/dotenv/load.ts";

const { MINECRAFT_SERVER_PATH: srcFolder, PORT, HOSTNAME } = config();

const server = serve({
  hostname: HOSTNAME ?? "127.0.0.1",
  port: parseInt(PORT, 10) ?? 1234,
});

for await (const request of server) {
  switch (request.url) {
    case "/download": {
      const informations = [];
      for await (const entry of Deno.readDir("public/saves")) {
        if (entry.name.match(".zip") === null) {
          continue;
        }
        informations.push({
          filename: entry.name,
          meta: await Deno.lstat("public/saves/" + entry.name),
        });
      }
      const sortedInfos = informations.sort((a, b) =>
        a.meta.birthtime!.getTime() -
        b.meta.birthtime!.getTime()
      );

      const content = await serveFile(
        request,
        `public/saves/${sortedInfos[sortedInfos.length - 1].filename}`,
      );
      request.respond(content);
      break;
    }

    case "/generate":
      if (await exists(srcFolder)) {
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
