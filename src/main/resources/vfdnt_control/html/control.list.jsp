<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<div class="control control--list">
    <h3>${fn:escapeXml(currentNode.displayableName)}</h3>
    <ul><li>maxItems: ${fn:escapeXml(currentNode.properties.maxItems.string)}</li></ul>
</div>
