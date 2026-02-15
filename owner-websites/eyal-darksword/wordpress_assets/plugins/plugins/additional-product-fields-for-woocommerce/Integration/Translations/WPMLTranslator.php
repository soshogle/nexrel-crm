<?php
/**
 * Created by PhpStorm.
 * User: Edgar
 * Date: 12/12/2017
 * Time: 7:09 PM
 */

namespace rednaowooextraproduct\Integration\Translations;

class WPMLTranslator extends TranslationBase {


    public function GetLanguages()
    {
        $languages=array();
        if(function_exists('icl_get_languages'))
        {

            $tempLanguajes=icl_get_languages();
            foreach($tempLanguajes as $language)
            {
                $languages[]=array(
                    'code'=>$language['code'],
                    'id'=>$language['id'],
                    'active'=>$language['active']=="1",
                    'translated_name'=>$language['translated_name'],
                    'country_flag_url'=>$language['country_flag_url']

                );
            }


        }

        return $languages;
    }

    public function GetDefaultLanguage()
    {
        return icl_get_default_language();
    }


    public function GetCurrentLanguage()
    {
        return apply_filters( 'wpml_current_language', null );

    }
}