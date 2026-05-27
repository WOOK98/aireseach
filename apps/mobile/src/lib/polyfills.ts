/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import structuredClone from "@ungap/structured-clone";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  const setupPolyfills = async () => {
    const { polyfillGlobal } = await import(
      // @ts-expect-error - polyfillGlobal is not typed
      "react-native/Libraries/Utilities/PolyfillFunctions"
    );

    const { TextEncoderStream, TextDecoderStream } =
      await import("@stardazed/streams-text-encoding");

    if (!("structuredClone" in global)) {
      polyfillGlobal("structuredClone", () => structuredClone);
    }

    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
  };

  void setupPolyfills();
}
