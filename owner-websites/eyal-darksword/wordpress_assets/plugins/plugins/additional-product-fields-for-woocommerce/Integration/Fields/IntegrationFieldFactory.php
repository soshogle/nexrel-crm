<?php


namespace rednaowooextraproduct\Integration\Fields;


class IntegrationFieldFactory
{
    public static function CreateField($order,$lineItem,$entry)
    {
        switch ($entry->Type)
        {
            case 'dropdown':
            case 'radio':
            case 'checkbox':
            case 'buttonselection':
            case 'colorswatcher':
            case 'imagepicker':
                return new MultipleOptionsIntegrationField($order,$lineItem,$entry);
            case 'datepicker':
                return new DateIntegrationField($order,$lineItem,$entry);
            case 'daterange':
                return new DateRangeIntegrationField($order,$lineItem,$entry);
            case 'signature':
                $file= new FileIntegrationField($order,$lineItem,$entry);
                $file->AddPath($entry->Path);
                return $file;
            case 'fileupload':
                $file= new FileIntegrationField($order,$lineItem,$entry);

                foreach($entry->Value as $currentValue)
                {
                    $file->AddPath($currentValue->Path);
                }

                return $file;
            case 'date':
                return new DateIntegrationField($order,$lineItem,$entry);
            case 'text':
            case 'number':
            case 'textarea':
            case 'masked':
            case 'colorpicker':
            case 'slider':

                return new SimpleIntegrationField($order,$lineItem,$entry);
            case 'switch':
                return new CheckIntegrationField($order,$lineItem,$entry);
            case 'list':
                return new ListIntegrationField($order,$lineItem,$entry);
        }

        return null;

    }
}