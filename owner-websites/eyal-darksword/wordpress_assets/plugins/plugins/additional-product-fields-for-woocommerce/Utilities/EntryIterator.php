<?php

namespace rednaowooextraproduct\Utilities;

class EntryIterator
{
    public static function FindFields($fieldsToSearch,$entry=null)
    {
        if($entry==null||!is_object($entry)||!isset($entry->Fields))
        {
            return [];
        }

        return self::InternalFindFields($fieldsToSearch,$entry->Fields);
    }

    private static function InternalFindFields($fieldsToSearch,$fieldList,$fieldsFound=[])
    {
        foreach($fieldList as $currentField)
        {
            if(!is_object($currentField)||!isset($currentField->Type))
            {
                continue;
            }

            if(in_array($currentField->Type,$fieldsToSearch))
            {
                $fieldsFound[]=$currentField;
            }

            if($currentField->Type=='repeater')
            {
                foreach($currentField->Value as $repeaterRow)
                {
                    self::InternalFindFields($fieldsToSearch,$repeaterRow,$fieldsFound);
                }
            }

            if(isset($currentField->Value)&&is_array($currentField->Value))
            {
                self::InternalFindFields($fieldsToSearch,$currentField->Value,$fieldsFound);
            }
        }

        return $fieldsFound;

    }

}