<?php


namespace rednaowooextraproduct\Integration\Translations;


abstract class TranslationBase
{
    /** @var $Loader */
    public $Loader;
    public function __construct($loader)
    {
        $this->Loader=$loader;
    }

    public function GetTranslations($id,$type,$language)
    {
        global $wpdb;
        $translations= $wpdb->get_var($wpdb->prepare("SELECT translations Translations FROM ".$this->Loader->TranslationTable." WHERE id=%d AND lang_code=%s and type=%d",$id,$language,$type));
        if($translations==null)
            return null;
        return json_decode($translations,true);
    }


    public abstract function GetDefaultLanguage();
    public abstract function GetCurrentLanguage();
    public abstract function GetLanguages();

    public function GetAllFormTranslations($formId,$type)
    {
        $translations=[];
        global $wpdb;
        $rows= $wpdb->get_results($wpdb->prepare("SELECT lang_code Language,translations Translations FROM ".$this->Loader->TranslationTable." WHERE id=%d and type=%d",$formId,$type));
        for($i=0;$i<count($rows);$i++)
        {
            $rows[$i]->Translations=json_decode($rows[$i]->Translations);
        }
        return $rows;
    }

    /**
     * @param $formId
     * @param $options FormBuilderOptions
     * @return void
     */
    public function TranslateProduct($productId,$options,&$translator)
    {
       /* if($this->GetCurrentLanguage()==$this->GetDefaultLanguage())
            return;*/

        $fields=apply_filters('aio_load_field_translation_config',[]);
        foreach($fields as $key=>&$value)
        {
            foreach($value as &$path)
                $path=explode('.',$path);

        }
        $translations=$this->GetTranslations($formId,$this->GetCurrentLanguage());
        $this->TranslateRows($fields,$options->Rows,$translations);

    }

    /**
     * @param $fieldDictionary
     * @param $Rows FBRowOptionsDTO[]
     * @return void
     */
    private function TranslateRows($fieldDictionary,&$Rows,$translations)
    {
        if(!is_array($Rows))
            return;
        foreach($Rows as $currentRow)
        {
            if(!isset($currentRow->Columns))
                continue;
            foreach($currentRow->Columns as $currentColumn)
            {
                $this->TranslateField($fieldDictionary,$currentColumn->Field,$translations);
            }
        }
    }

    /**
     * @param $fieldDictionary
     * @param $field FieldBaseOptionsDTO
     * @return void
     */
    private function TranslateField($fieldDictionary, $field,$translations)
    {
        if(!isset($fieldDictionary[$field->Type]))
            return;

        if(isset($fieldDictionary['*']))
            foreach($fieldDictionary['*'] as $currentTranslation)
                $this->MaybeTranslatePath($currentTranslation,$field,$translations);


        foreach($fieldDictionary[$field->Type] as $currentTranslation)
            $this->MaybeTranslatePath($currentTranslation,$field,$translations);


        if(isset($field->RepeaterItemTemplate))
        {
            $this->TranslateRows($fieldDictionary,$field->RepeaterItemTemplate->Rows,$translations);
        }


        if(isset($field->Rows))
        {
            $this->TranslateRows($fieldDictionary,$field->Rows,$translations);
        }

        if($field->Type=='productgroup'&&isset($field->Products))
        {
            foreach($field->Products as $currentProduct)
            {
                $this->TranslateRows($fieldDictionary,$currentProduct->Rows,$translations);
            }
        }

    }

    private function MaybeTranslatePath($path,&$object,$translations)
    {
        $currentPath=array_shift($path);
        if(strpos($currentPath,'[]')!==false)
        {
            $currentPath=str_replace('[]','',$currentPath);
            if(!isset($object->$currentPath))
                return;

            if(!is_array($object->$currentPath))
                return;
            foreach($object->$currentPath as &$currentValue)
            {
                $this->MaybeTranslatePath($path,$currentValue,$translations);
            }

            return;
        }

        if(count($path)>0)
        {
            if(!isset($object->$currentPath))
                return;

            $this->MaybeTranslatePath($path,$object->$currentPath,$translations);
        }

        if(strpos($currentPath,':'))
        {
            $split=explode(':',$currentPath);
            $renderer=$split[1];
            $path=$split[0];

            switch($renderer)
            {
                case 'RichText':
                    $this->MaybeTranslateRichText($object->$path,$translations);
                    break;
                case 'RNT':
                    if($object!=null&&isset($object->$path))
                    {
                        $value=$object->$path;

                        if(!isset(FormLoader::$Translations['AIOTranslations']))
                            FormLoader::$Translations['AIOTranslations']=[];

                        if(!empty($value)&&!isset(FormLoader::$Translations['AIOTranslations'][$value])&&isset($translations->$value))
                            FormLoader::$Translations['AIOTranslations'][$object->$path]=$translations->$value;
                    }
            }
        }

        $this->MaybeTranslateString($object,$currentPath,$translations);
    }

    private function MaybeTranslateRichText(&$object,$translations)
    {
        if($object==null)
            return;
        if(is_array($object))
        {
            foreach($object as &$currentValue)
                $this->MaybeTranslateRichText($currentValue,$translations);
        }

        if(isset($object->type)&&$object->type=='text')
        {
            $this->MaybeTranslateString($object,'text',$translations);
        }

        if(isset($object->content))
        {
            $this->MaybeTranslateRichText($object->content,$translations);
        }

    }

    private function MaybeTranslateString($object, $currentPath, $translations)
    {
        if($object!=null&&isset($object->$currentPath))
        {
            $value=$object->$currentPath;
            if(isset($translations->$value))
                $object->$currentPath=$translations->$value;
        }
    }
}