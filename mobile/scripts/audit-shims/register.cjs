/*
 * Preload hook (node -r) that redirects
 * require("@react-native-async-storage/async-storage") to the in-memory shim
 * in this directory, so the real (compiled) cache.ts — and every real
 * data-layer module that calls withCache() — runs unmodified under plain
 * Node. This is the ONLY native-module dependency anywhere in
 * generateItinerary()'s import graph (verified by grepping mobile/src/lib for
 * react-native/expo imports): everything else is plain TS + global fetch.
 */
const Module = require("module");
const path = require("path");

const TARGET = "@react-native-async-storage/async-storage";
const SHIM = path.join(__dirname, "async-storage.cjs");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === TARGET) return SHIM;
  return originalResolve.call(this, request, ...rest);
};
