<?php


namespace rednaowooextraproduct\panel;


use rednaowooextraproduct\core\Loader;
use rednaowooextraproduct\Integration\PluginsIntegration\PluginIntegrationManager;
use rednaowooextraproduct\Integration\Translations\TranslatorFactory;
use rednaowooextraproduct\pr\Utilities\Activator;
use rednaowooextraproduct\repository\ProductRepository;

class ProductBuilderPanel
{
    /** @var Loader */
    public $loader;
    public function __construct($loader)
    {
        $this->loader=$loader;
    }


    public function Execute()
    {
        PluginIntegrationManager::Initialize($this->loader);
        $post_id=get_the_ID();
        $currency=get_woocommerce_price_format();
        $repository=new ProductRepository();

        $this->loader->AddRNTranslator(array('ProductFieldBuilder','InternalShared','ProductDesignerPro'));
        $this->loader->AddScript('shared-core','js/dist/SharedCore_bundle.js',array('@RNTranslator','wp-element','regenerator-runtime'));
        $this->loader->AddScript('internal-shared','js/dist/InternalShared_bundle.js',array('@shared-core'));
        $this->loader->AddScript('form-builder','js/dist/FormBuilder_bundle.js',array('wp-i18n','@RNTranslator','@internal-shared','jquery'));
        $this->loader->AddStyle('form-builder','js/dist/FormBuilder_bundle.css');

        $this->loader->AddScript('productquantity_calculator','js/dist/ProductQuantityCalculator_bundle.js',array('@form-builder'));
        $this->loader->AddScript('formulaperitem_calculator','js/dist/FormulaPerItemCalculator_bundle.js',array('@form-builder'));

        $additionalFields=array();
        $additionalFields=\apply_filters('woo-extra-product-get-additional-fields',$additionalFields);
        $dependencies=array();
        foreach ($additionalFields as $field)
        {
            $dependencies[]='@'.$field;
            $this->loader->AddScript($field,'js/dist/'.$field.'_bundle.js',array('@form-builder'));
        }

        $dependencies=apply_filters('woo-extra-product-fields-loaded',$dependencies);

        $fieldsWidthStyle=['FBAppointment','FBPopUpSelector','FBGroupButton','FBDatePicker','FBSizeChart','FBPopup','FBCollapsible','FBDateRange','FBDropDown','FBTextWithStyles','FBFile','FBGroupPanel','FBImagePicker','FBList','FBRepeater','FBSlider','FBRange','FBButtonSelection','FBSignature','FBColorSwatcher','FBTermOfService','FBSearchableSelect','FBLikertScale','FBSurvey','FBFontPicker'];
        foreach($fieldsWidthStyle as $currentDynamicField )
        {
            $this->loader->AddStyle($currentDynamicField, 'js/dist/' . $currentDynamicField . '_bundle.css');
        }


        $dependencies=\apply_filters('woo-extra-product-load-designer',$dependencies);

        if($this->loader->IsPR())
        {
            $this->loader->AddScript('FormBuilderPr', 'js/dist/FormBuilderPr_bundle.js',array('@form-builder'));
        }


        $this->loader->AddScript('products-builder','js/dist/ProductFieldBuilder_bundle.js', array('@form-builder'));
        $this->loader->AddStyle('products-builder','js/dist/ProductFieldBuilder_bundle.css');

        if($this->loader->IsPR())
        {
            $this->loader->AddScript('multiplesteps','js/dist/MultipleSteps_bundle.js', array('@form-builder'));
            $this->loader->AddScript('multiplestepsdesigner','js/dist/MultipleStepsDesigner_bundle.js', array('@products-builder'));
            $this->loader->AddScript('OptionsPriceCondition','js/dist/ChangeOptionsPriceConditionProcessor_bundle.js', array('@products-builder'));
            $this->loader->AddScript('ChangeImageCondition','js/dist/ChangeImageConditionProcessor_bundle.js', array('@products-builder'));


            $this->loader->AddScript('MaximumNumberOfItems','js/dist/MaximumNumberOfItemsConditionProcessor_bundle.js', array('@products-builder'));
            $this->loader->AddScript('MinimumNumberOfItems','js/dist/MinimumNumberOfItemsConditionProcessor_bundle.js', array('@products-builder'));

            $dependencies[]='@multiplesteps';
            $dependencies[]='@multiplestepsdesigner';
            $dependencies[]='@OptionsPriceCondition';
        }



        $this->loader->AddScript('products-builder-runnable','js/dist/RunnableDesigner_bundle.js',\array_merge($dependencies, \array_merge($dependencies, array('@products-builder','@productquantity_calculator'))));
        $this->loader->AddStyle('products-builder-runnable','js/dist/RunnableDesigner_bundle.css');

        $licenseKey='';
        $licenseIsActive=false;
        if($this->loader->IsPR())
        {
            $licenseKey=Activator::GetLicenseKey($this->loader);
        }

        $options=$repository->GetProductExtraOptions($post_id,true,true);


        $parsedOptions=json_decode($options);
        if($parsedOptions!=null)
            do_action('woo-extra-product-load-fonts',$parsedOptions);

        $translator=TranslatorFactory::GetTranslator($this->loader);

        $this->loader->LocalizeScript('rednaoProductDesigner','products-builder','product_designer',apply_filters('woo-extra-product-initialize-product-designer-var',array(
                'ProductId'=>$post_id,
           'ProductNonce'=>\wp_create_nonce($post_id.'_product_designer'),
           'Fees'=>$repository->GetProductFees($post_id,true),
           'URL'=>$this->loader->URL,
            'IsDesign'=>true,
            'IsPr'=>$this->loader->IsPR(),
            'PurchaseURL'=>'http://google.com',
            'Options'=>$options,
            'ServerOptions'=>$repository->GetAllServerOptions($post_id),
            'Variations'=>$repository->GetVariations($post_id),
            'AllAttributes'=>$repository->GetAttributes($post_id),
            'WCCurrency'=>array(
                'Format'=>get_woocommerce_price_format(),
                'Decimals'=>wc_get_price_decimals(),
                'ThousandSeparator'=>wc_get_price_thousand_separator(),
                'DecimalSeparator'=>wc_get_price_decimal_separator(),
                'Symbol'=>get_woocommerce_currency_symbol()
            ),
            "LicenseKey"=>$licenseKey,
            "DefaultShowFinalAmount"=>apply_filters('woo-extra-product-default-show-final-amount','show'),
            "DefaultShowOptionsAmount"=>apply_filters('woo-extra-product-default-show-options-amount','show'),
            "DefaultFinalAmountLabel"=>__("Final Total","rednaowooextraproduct"),
            "DefaultOptionAmountLabel"=>__("Options amount","rednaowooextraproduct"),
            'SiteURL'=>\get_home_url(),
            "ItemId"=>$this->loader->GetConfig('ItemId'),
            'Languages'=>$translator==null?[]:$translator->GetLanguages(),
            'DefaultLanguage'=>$translator==null?'':$translator->GetDefaultLanguage(),
            'FormTranslations'=>$translator==null?[]:$translator->GetAllFormTranslations($post_id,ProductRepository::TRANSLATION_TYPE_PRODUCT),
            'Translations'=>require_once $this->loader->DIR.'Integration/Translations/FieldTranslationConfig.php',
            'UpdateURL'=>$this->loader->GetConfig('UpdateURL')
        )));


        ?>
        <div class="panel woocommerce_options_panel" id="rednao-advanced-products" style="padding: 10px">
            <input type="hidden" name="rednao_advanced_fees" id="rednao_advanced_product_fees" value=""/>
            <input type="hidden" name="rednao_advanced_translations" id="rednao_advanced_product_translations" value=""/>
            <input type="hidden" name="rednao_advanced_product_options" id="rednao_advanced_product_options_input" value=""/>
            <input type="hidden" name="rednao_advanced_product_server_options" id="rednao_advanced_product_server_options_input" value=""/>
            <div id="rednao-advanced-products-designer">
                Loading builder, please wait a bit...
            </div>
        </div>
<?php
    }
}