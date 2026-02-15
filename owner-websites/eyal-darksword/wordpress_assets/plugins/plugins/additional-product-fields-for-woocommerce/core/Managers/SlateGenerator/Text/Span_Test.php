<?php

namespace rednaowooextraproduct\core\Managers\SlateGenerator\Text;

use PHPUnit\Framework\TestCase;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateGenerator;

class SpanTest extends TestCase
{

    public function testNormalText()
    {
        $slateGenerator=new SlateGenerator(null,\json_decode('{"object":"value","document":{"object":"document","data":{},"nodes":[{"object":"block","type":"paragraph","data":{},"nodes":[{"object":"text","leaves":[{"object":"leaf","text":"Hello World","marks":[]}]}]}]}}'));
        $html=$slateGenerator->GetHtml();
        $this->assertEquals($html,'<div><p><span><span>Hello World</span></span></p></div>');
    }

    public function testMarks()
    {
        $slateGenerator=new SlateGenerator(null,\json_decode('{"object":"value","document":{"object":"document","data":{},"nodes":[{"object":"block","type":"paragraph","data":{},"nodes":[{"object":"text","leaves":[{"object":"leaf","text":"Hello World","marks":[{"object":"mark","type":"bold","data":{}},{"object":"mark","type":"italic","data":{}},{"object":"mark","type":"underline","data":{}},{"object":"mark","type":"color","data":{"hex":"#f70000"}},{"object":"mark","type":"size","data":{"size":36}}]}]}]}]}}'));
        $html=$slateGenerator->GetHtml();
        $this->assertEquals($html,'<div><p><span><span style="font-weight:bold;font-style:italic;text-decoration:underline;color:#f70000;font-size:36px;">Hello World</span></span></p></div>');
    }
}
