<?php


namespace rednaowooextraproduct\Integration\Translations;


class TranslatorFactory
{
    /**
     * @return TranslationBase
     */
    public static function GetTranslator($loader){

        if(class_exists('Polylang') )
        {
            return new PolylangTranslator($loader);
        }


        if(defined('ICL_LANGUAGE_CODE'))
        {
            return new WPMLTranslator($loader);
        }

        return null;
    }
}