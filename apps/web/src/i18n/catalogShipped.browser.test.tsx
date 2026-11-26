import { GTProvider } from "gt-react";
import { expect, it } from "vite-plus/test";
import { render } from "../../test/render";
import { zhCN } from "./catalog";
import { useUiText } from "./useUiText";
import zh from "./translations/zh.json";

const keys = Object.entries(zhCN).filter(([source, value]) => source !== value);

function Probe({ onResult }: { readonly onResult: (missing: string[]) => void }) {
  const text = useUiText();
  onResult(keys.flatMap(([source]) => (text(source) === source ? [source] : [])));
  return null;
}

it("renders every Chinese catalog entry in the active GT locale", async () => {
  let missing: string[] = [];
  await using _screen = await render(
    <GTProvider locale="zh" translations={{ zh, en: {} } as never}>
      <Probe onResult={(found) => (missing = found)} />
    </GTProvider>,
    { router: false },
  );
  expect(missing).toEqual([]);
});
