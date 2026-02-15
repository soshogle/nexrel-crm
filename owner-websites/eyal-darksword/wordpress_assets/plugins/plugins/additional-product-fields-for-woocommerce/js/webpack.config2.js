const MiniCssExtractPlugin = require('mini-css-extract-plugin');


function FormBuilderLocator(context, request, callback) {
    if (/^FormBuilder\/.*/.test(request)){
        return callback(null,"RedNaoFormBuilder.default('"+request+"')");
    }

    if (/^FormBuilderPr\/.*/.test(request)){
        return callback(null,"RedNaoFormBuilderPr.default('"+request+"')");
    }

    if (/^FormulaParser\/.*/.test(request)){
        return callback(null,"RedNaoFormulaParser.default('"+request+"')");
    }

    if (/^OrderDashboard\/.*/.test(request)){
        return callback(null,"RedNaoOrderDashboard.default('"+request+"')");
    }

    if (/^ProductFieldBuilder\/.*/.test(request)){
        return callback(null,"RedNaoProductFieldBuilder.default('"+request+"')");
    }

    if (/^InternalShared\/.*/.test(request)){
        return callback(null,"RedNaoInternalShared.default('"+request+"')");
    }

    if (/^MultipleStepsDesigner\/.*/.test(request)){
        return callback(null,"RedNaoMultipleStepsDesigner.default('"+request+"')");
    }

    if (/^MultipleSteps\/.*/.test(request)){
        return callback(null,"RedNaoMultipleSteps.default('"+request+"')");
    }

    if (/^FreeFields\/Fields.*/.test(request)){
        let matches=/FreeFields\/Fields\/([^\/]*)\/(.*)/.exec(request);
        let libraryName=matches[1];
        let requestedLibrary=matches[2];
        return callback(null,"RedNao"+libraryName+".default(\""+libraryName+'/'+requestedLibrary+"\")");
    }

    if (/^shared\/core\/.*/.test(request)){
        return callback(null,"RedNaoSharedCore.default('"+request+"')");
    }

    callback();
}
var ExtractTranslationKeysPlugin = require('./src/shared/webpack/webpack-extract-translation-keys-plugin/index');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const webpack = require('webpack');
var path = require('path');
module.exports=(env,args)=>{

    let isProduction=args.mode!=null&&args.mode=='production';

    cssLoader= [
        {
            loader: MiniCssExtractPlugin.loader,
            options: {
                // you can specify a publicPath here
                // by default it uses publicPath in webpackOptions.output
                publicPath: '../',
                hmr: process.env.NODE_ENV === 'development',
            },
        },
        'css-loader',
    ];

    if(!isProduction)
        cssLoader=['style-loader','css-loader']

    let plugins=[
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // all options are optional
            filename: '[name]_bundle.css',
            chunkFilename: '[name]_chunk_bundle.css',
            ignoreOrder: false, // Enable to remove warnings about conflicting order
        }),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new ExtractTranslationKeysPlugin({
            functionName: 'RNTranslate',
            output: path.join(__dirname, '../jstranslations/[name]'),
            domain:'rednaowooextraproduct'
        })
    ];
    if(isProduction)
        plugins.push(new BundleAnalyzerPlugin());

    return {
    entry:{
        MultipleStepsDesigner:'./src/app/MultipleSteps/Designer/Bootstrap.tsx',
        MultipleSteps:'./src/app/MultipleSteps/Runnable/Bootstrap.tsx',
        FormBuilder:'./src/app/FormBuilder/Bootstrap.ts',
        FormBuilderPr:'./src/app/FormBuilderPr/Bootstrap.tsx',
        FormulaParser:'./src/app/FormulaParser/FormulaParser.ts',
        DeactivationDialog:'./src/app/DeactivationDialog/Bootstrap.tsx',
        ProductDesignerPro:'./src/app/Pro/FieldDesigner/DesignBootstrap.tsx',
        RunnableDesigner:'./src/app/Runnable/Designer.tsx',
        RunnableFormBuilder:'./src/app/Runnable/Bootstrap.tsx',
        ProductFieldBuilder:'./src/app/ProductFieldBuilder/Bootstrap.ts',
        FBHidden:'./src/app/Pro/Fields/Fields/FBHidden/FBHidden.tsx',
        FBList:'./src/app/Pro/Fields/Fields/FBList/FBList.tsx',
        FBFile:'./src/app/Pro/Fields/Fields/FBFile/FBFile.tsx',
        FBGroupPanel:'./src/app/Pro/Fields/Fields/FBGroupPanel/FBGroupPanel.tsx',
        FBRepeater:'./src/app/Pro/Fields/Fields/FBRepeater/FBRepeater.tsx',
        FBImagePicker:'./src/app/Pro/Fields/Fields/FBImagePicker/FBImagePicker.tsx',
        FBDateRange:'./src/app/Pro/Fields/Fields/FBDateRange/FBDateRange.tsx',
        FBMaskedField:'./src/app/FreeFields/Fields/FBMaskedField/FBMaskedField.tsx',
        FBCheckBox:'./src/app/FreeFields/Fields/FBCheckBox/FBCheckBox.tsx',
        FBColorPickerField:'./src/app/FreeFields/Fields/FBColorPickerField/FBColorPickerField.tsx',
        OrderDashboard:'./src/app/OrderDashboard/Bootstrap.tsx',
        InternalShared:'./src/app/InternalShared/Bootstrap.ts',
        FBDivider:'./src/app/FreeFields/Fields/FBDivider/FBDivider.tsx',
        FBDropDown:'./src/app/FreeFields/Fields/FBDropDown/FBDropDown.tsx',
        FBButtonSelection:'./src/app/FreeFields/Fields/FBButtonSelection/FBButtonSelection.tsx',
        FBParagraph:'./src/app/FreeFields/Fields/FBParagraph/FBParagraph.tsx',
        FBRadio:'./src/app/FreeFields/Fields/FBRadio/FBRadio.tsx',
        FBSwitch:'./src/app/FreeFields/Fields/FBSwitch/FBSwitch.tsx',
        FBTextArea:'./src/app/FreeFields/Fields/FBTextArea/FBTextArea.tsx',
        FBSlider:'./src/app/FreeFields/Fields/FBSlider/FBSlider.tsx',
        FBTextField:'./src/app/FreeFields/Fields/FBTextField/FBTextField.tsx',
        FBDatePicker:'./src/app/FreeFields/Fields/FBDatePicker/FBDatePicker.tsx',
        FBSignature:'./src/app/FreeFields/Fields/FBSignature/FBSignature.tsx',
        FBColorSwatcher:'./src/app/FreeFields/Fields/FBColorSwatcher/FBColorSwatcher.tsx',
        FBTermOfService:'./src/app/FreeFields/Fields/FBTermOfService/FBTermOfService.tsx',
        FBGoogleMaps:'./src/app/FreeFields/Fields/FBGoogleMaps/FBGoogleMaps.tsx',
        FBTextualImage:'./src/app/FreeFields/Fields/FBTextualImage/FBTextualImage.tsx',
        SharedCore:'./src/shared/core/Bootstrap.tsx'

    },
    optimization:{
        namedChunks:true,
        splitChunks:{
            chunks:'all'
          }
    },
    plugins:plugins,
    node:{
        fs:'empty',
        child_process:'empty'
    },
    output: {
        path:path.join(__dirname, "./dist"),
        filename: "[name]_bundle.js",
        chunkFilename: '[name]_chunk_bundle.js',
        library:'RedNao[name]'
    },
    mode:'development',
    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    devServer: {

        contentBase: path.join(__dirname+'/../', "dist"),
        compress: false,
        port: 4200
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
        alias:{
            shared:path.resolve(__dirname,'./src/shared/')
        }
    },
    externals:[{
        '@wordpress/i18n': { this: [ 'wp', 'i18n' ] },
        '@RedNaoPDFShared':'RedNaoPDFShared',
        'jquery':'jQuery',
        'react':'React',
        'react-dom':'ReactDOM',
        'RNTranslator':'RNTranslator'
    },FormBuilderLocator],
    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/, loader:   "babel-loader" ,exclude:/node_modules/},
            { enforce: "pre", test: /\.jsx?$/, loader: "babel-loader" ,exclude:/node_modules/},
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" ,exclude:/node_modules/},
            {test: /\.css$/, "use":cssLoader},
            {  test: /\.scss$/, use: [
                    "style-loader", // creates style nodes from JS strings
                    "css-loader", // translates CSS into CommonJS
                    "sass-loader" // compiles Sass to CSS, using Node Sass by default
                ]}
        ]
    }

}}