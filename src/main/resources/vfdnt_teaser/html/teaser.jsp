<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<div class="teaser teaser--default">
    <h3>${fn:escapeXml(currentNode.displayableName)}</h3>
    <p>${fn:escapeXml(currentNode.properties.teaserText.string)}</p>
</div>
