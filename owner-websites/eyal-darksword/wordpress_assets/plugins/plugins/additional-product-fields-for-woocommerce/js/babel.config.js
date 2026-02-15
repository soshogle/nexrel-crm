module.exports={
  "comments":true,
  "presets": [
    "@babel/env",
    "@babel/typescript",
    "@babel/react"
  ],
  "plugins": [
    "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-proposal-nullish-coalescing-operator",
    ["@babel/plugin-proposal-decorators", {
      "legacy": true
    }],
    ["@babel/proposal-class-properties",
      {
        "loose": true
      }
    ],
    "@babel/proposal-object-rest-spread"
  ]
}